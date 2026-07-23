import { Injectable, Logger } from '@nestjs/common';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { BedrockAlertResponseSchema, type BedrockAlertResponse, type ClimateCache } from '@agrocentinela/shared';

@Injectable()
export class BedrockService {
  private readonly logger = new Logger(BedrockService.name);
  private readonly client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
  private readonly ssm = new SSMClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
  private modelId: string | null = null;

  private async getModelId(): Promise<string> {
    if (this.modelId) return this.modelId;
    const res = await this.ssm.send(
      new GetParameterCommand({ Name: '/agrocentinela/dev/bedrock-model-text' }),
    );
    this.modelId = res.Parameter?.Value ?? 'anthropic.claude-3-haiku-20240307-v1:0';
    return this.modelId;
  }

  async generateAlert(
    crop: string,
    stage: string,
    climate: ClimateCache,
    lat: number,
    lon: number,
  ): Promise<BedrockAlertResponse | null> {
    const prompt = this.buildPrompt(crop, stage, climate, lat, lon);
    try {
      const modelId = await this.getModelId();
      const response = await this.client.send(
        new InvokeModelCommand({
          modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 400,
            messages: [{ role: 'user', content: prompt }],
          }),
        }),
      );

      const body = JSON.parse(new TextDecoder().decode(response.body));
      const text = body.content[0].text;
      const cleaned = text.replace(/```json\s*|```\s*/g, '').trim();
      const json: unknown = JSON.parse(cleaned);

      const result = BedrockAlertResponseSchema.safeParse(json);
      if (!result.success) {
        this.logger.warn(
          JSON.stringify({ event: 'bedrock_validation_failed', issues: result.error.issues }),
        );
        return null;
      }
      return this.sanitize(result.data);
    } catch (err) {
      this.logger.error(JSON.stringify({ event: 'bedrock_invocation_error', error: String(err) }));
      return null;
    }
  }

  private sanitize(data: BedrockAlertResponse): BedrockAlertResponse {
    const strip = (s: string) => s.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
    return {
      ...data,
      message: strip(data.message),
      recommendedAction: strip(data.recommendedAction),
    };
  }

  private buildPrompt(
    crop: string,
    stage: string,
    climate: ClimateCache,
    lat: number,
    lon: number,
  ): string {
    const temps = climate.hourly48h.map((h) => h.temperature2m);
    const dailySummary = climate.days.map((d) =>
      `${d.date}: max ${d.temperatureMax}°C, min ${d.temperatureMin}°C, lluvia ${d.precipitationSum}mm, ET0 ${d.et0}mm`,
    ).join('\n');

    return `<instruccion>
Sos un agrónomo asistiendo a un productor en el NOA argentino (lat ${lat}, lon ${lon}).
Cultivo: ${crop}, etapa fenológica: ${stage}.

Analizá el pronóstico y decidí si hay riesgo de helada o estrés hídrico.

Respondé ÚNICAMENTE con un JSON válido, sin markdown ni texto extra:
{
  "message": "mensaje breve y accionable en español para el productor",
  "severity": <número entero 1-5>,
  "recommendedAction": "acción concreta en español",
  "condition": "<helada | estres-hidrico>"
}

"condition" MUST be one of: "helada", "estres-hidrico". No other values allowed.
"severity" MUST be an integer between 1 and 5.
</instruccion>

<datos>
Pronóstico diario 7d:
${dailySummary}

Temperaturas horarias 48h (°C): ${JSON.stringify(temps)}
</datos>`;
  }
}
