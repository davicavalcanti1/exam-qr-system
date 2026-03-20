export const EXAMS = [
  { name: 'Ressonância Magnética', value: 500 },
  { name: 'Tomografia', value: 350 },
  { name: 'Mamografia', value: 120 },
  { name: 'Raio-X', value: 80 },
  { name: 'Densitometria Óssea', value: 100 },
  { name: 'Ultrassom', value: 150 },
]

export const BUDGET_LIMIT = parseFloat(process.env.BUDGET_LIMIT || '2000')
