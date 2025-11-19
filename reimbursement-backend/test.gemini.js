    // test-gemini-key.js
// Run this script to verify your API key is working correctly

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testApiKey() {
  console.log('\n🔍 Testing Gemini API Key Configuration...\n');
  
  // Step 1: Check if API key exists
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables!');
    console.log('\nPlease:');
    console.log('1. Create a .env file in your project root');
    console.log('2. Add: GEMINI_API_KEY=your_api_key_here');
    console.log('3. Get your key from: https://aistudio.google.com/app/apikey');
    return false;
  }
  
  console.log('✅ API Key found');
  console.log('   Prefix:', apiKey.substring(0, 10) + '...');
  console.log('   Length:', apiKey.length, 'characters');
  console.log('   Last 4:', '...' + apiKey.substring(apiKey.length - 4));
  console.log();
  
  // Step 2: Test API connectivity
  console.log('🔄 Testing API connection...\n');
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try different models to see which works
    const models = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro'
    ];
    
    for (const modelName of models) {
      try {
        console.log(`Testing ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const prompt = "Say 'Hello' in one word only";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ ${modelName} is working!`);
        console.log(`   Response: "${text.trim()}"`);
        console.log();
        
        return true;
        
      } catch (error) {
        if (error.status === 429) {
          console.log(`⚠️  ${modelName}: Rate limited (429)`);
          console.log(`   This is the quota issue you're experiencing`);
          console.log();
        } else if (error.status === 404) {
          console.log(`❌ ${modelName}: Model not found (404)`);
          console.log();
        } else if (error.status === 403) {
          console.log(`❌ ${modelName}: Permission denied (403)`);
          console.log(`   Your API key may not have access to this model`);
          console.log();
        } else {
          console.log(`❌ ${modelName}: ${error.message}`);
          console.log();
        }
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI');
    console.error('   Error:', error.message);
    return false;
  }
}

async function checkQuotaStatus() {
  console.log('\n📊 Checking Quota Status...\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API is accessible');
      console.log('   Available models:', data.models?.length || 0);
      console.log();
      
      if (data.models && data.models.length > 0) {
        console.log('📋 Your available models:');
        data.models.slice(0, 5).forEach(model => {
          console.log(`   - ${model.name}`);
        });
        if (data.models.length > 5) {
          console.log(`   ... and ${data.models.length - 5} more`);
        }
      }
    } else {
      console.log('⚠️  API responded with status:', response.status);
      const errorText = await response.text();
      console.log('   Error:', errorText.substring(0, 200));
    }
    
  } catch (error) {
    console.error('❌ Could not check quota status');
    console.error('   Error:', error.message);
  }
}

async function provideSolutions() {
  console.log('\n\n💡 SOLUTIONS FOR RATE LIMIT ERRORS:\n');
  console.log('1. ENABLE BILLING (Recommended):');
  console.log('   → Go to: https://console.cloud.google.com');
  console.log('   → Select your project');
  console.log('   → Enable billing (you still get free tier usage)');
  console.log();
  
  console.log('2. USE DIFFERENT IP ADDRESS:');
  console.log('   → Try from mobile hotspot');
  console.log('   → Use VPN');
  console.log('   → Deploy to cloud server');
  console.log();
  
  console.log('3. COMPLETELY NEW GOOGLE ACCOUNT:');
  console.log('   → Use different email (not just new API key)');
  console.log('   → Create from different network');
  console.log('   → Make sure you\'re logged into the NEW account in browser');
  console.log();
  
  console.log('4. IMPLEMENT RATE LIMITING:');
  console.log('   → Limit to 15 requests per minute');
  console.log('   → Add exponential backoff');
  console.log('   → Queue requests instead of sending all at once');
  console.log();
  
  console.log('5. ALTERNATIVE: Use different AI service temporarily:');
  console.log('   → OpenAI GPT-4 Vision');
  console.log('   → Claude API (Anthropic)');
  console.log('   → Azure Computer Vision');
  console.log();
}

// Run all tests
async function runAllTests() {
  console.log('═══════════════════════════════════════');
  console.log('  GEMINI API KEY VERIFICATION TEST');
  console.log('═══════════════════════════════════════');
  
  const apiKeyWorks = await testApiKey();
  await checkQuotaStatus();
  
  if (!apiKeyWorks) {
    await provideSolutions();
  } else {
    console.log('\n✅ SUCCESS! Your API key is working correctly.\n');
    console.log('If you get rate limit errors in your app, use the');
    console.log('retry logic provided in the main implementation.\n');
  }
  
  console.log('═══════════════════════════════════════\n');
}

// Run the tests
runAllTests().catch(console.error);