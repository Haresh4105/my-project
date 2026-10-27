export type ScreeningInput = {
  age: number;
  symptoms?: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  spo2?: number;
};
export type RiskResult = { riskLevel: 'Low'|'Moderate'|'High'; summary: string; flags: string[] };

// Transparent illustrative thresholds for a software demo; not a clinically validated model.
export function assessRisk(input: ScreeningInput): RiskResult {
  const flags: string[] = [];
  const symptoms=(input.symptoms||'').toLowerCase();
  const urgentPhrases=['chest pain','difficulty breathing','shortness of breath','unconscious','seizure','severe bleeding','blue lips'];
  if (urgentPhrases.some(s=>symptoms.includes(s))) flags.push('Reported symptom may require urgent medical evaluation');
  if (input.spo2 !== undefined && input.spo2 < 92) flags.push('Oxygen saturation is below 92%');
  if (input.systolic !== undefined && input.systolic >= 180) flags.push('Systolic blood pressure is very high (180 mmHg or above)');
  if (input.diastolic !== undefined && input.diastolic >= 120) flags.push('Diastolic blood pressure is very high (120 mmHg or above)');
  if (input.temperature !== undefined && input.temperature >= 39.4) flags.push('High temperature recorded (39.4°C or above)');
  if (input.heartRate !== undefined && (input.heartRate < 40 || input.heartRate > 130)) flags.push('Heart rate is outside the demo reference range');
  if (input.spo2 !== undefined && input.spo2 >= 92 && input.spo2 < 95) flags.push('Oxygen saturation is lower than expected in many adults');
  if (input.systolic !== undefined && input.systolic >= 140 && input.systolic < 180) flags.push('Elevated systolic blood pressure recorded');
  if (input.diastolic !== undefined && input.diastolic >= 90 && input.diastolic < 120) flags.push('Elevated diastolic blood pressure recorded');
  if (input.temperature !== undefined && input.temperature >= 38) flags.push('Fever-range temperature recorded');
  if (input.age >= 65) flags.push('Older adult: consider individual risk and timely professional review');
  if (symptoms.trim()) flags.push('Symptoms reported; review with a healthcare professional if persistent or worsening');
  const urgent=urgentPhrases.some(s=>symptoms.includes(s)) || (input.spo2!==undefined&&input.spo2<92) ||
    (input.systolic!==undefined&&input.systolic>=180) || (input.diastolic!==undefined&&input.diastolic>=120) ||
    (input.heartRate!==undefined&&(input.heartRate<40||input.heartRate>130));
  const riskLevel: RiskResult['riskLevel'] = urgent ? 'High' : flags.length ? 'Moderate' : 'Low';
  const summary = riskLevel==='High'
    ? 'Potential warning signs detected. Seek urgent local medical assessment; do not rely on this tool.'
    : riskLevel==='Moderate'
    ? 'One or more items may need follow-up. Arrange review with a qualified healthcare professional.'
    : 'No configured demo warning rules were triggered. This does not confirm that the person is healthy.';
  return {riskLevel,summary,flags};
}
