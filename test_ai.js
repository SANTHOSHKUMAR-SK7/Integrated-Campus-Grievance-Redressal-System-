import { analyzeGrievanceState } from './services/geminiService.ts';

async function testAI() {
  try {
    console.log('Testing AI with sample grievance...');
    const result = await analyzeGrievanceState('The wifi in the hostel is not working properly', []);
    console.log('AI Result:', JSON.stringify(result, null, 2));
    console.log('✅ AI is working!');
  } catch (error) {
    console.error('❌ AI failed:', error.message);
  }
}

testAI();