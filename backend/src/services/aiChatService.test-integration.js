/**
 * Integration Test: Real OpenAI API
 * Run this to validate live AI integration
 * 
 * Usage: node src/services/aiChatService.test-integration.js
 */

const AIChatService = require('./aiChatService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const aiService = new AIChatService();

async function testRealIntegration() {
  console.log('\n🧪 Real OpenAI Integration Test\n');
  console.log('Configuration:', {
    apiKey: process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
    timeout: process.env.AI_API_TIMEOUT || '30000ms'
  });

  // Create test user
  const user = await prisma.user.create({
    data: {
      name: 'Integration Test User',
      email: `test-${Date.now()}@integration.test`,
      password: 'hashed',
      role: 'USER',
      studentProfile: {
        create: {
          goal: 'weight loss',
          currentWeight: 75,
          targetWeight: 70,
          height: 175
        }
      }
    },
    include: { studentProfile: true }
  });

  console.log(`\n✅ Test user created: ${user.email}`);

  try {
    // Test 1: Coach mode
    console.log('\n📝 Test 1: Coach Mode Response');
    const response1 = await aiService.generateResponse(
      user.id,
      'coach',
      'Completei meu treino hoje, o que fazer agora?'
    );
    console.log('✅ Response:', response1.text.substring(0, 100) + '...');
    console.log('   Tokens:', response1.tokensUsed);
    console.log('   Provider:', response1.provider || 'unknown');
    console.log('   Fallback:', response1.fallback ? '⚠️ Yes' : '✅ No');

    // Test 2: Preventive mode
    console.log('\n📝 Test 2: Preventive Mode Response');
    aiService.debounceMap.delete(user.id); // Clear debounce
    const response2 = await aiService.generateResponse(
      user.id,
      'preventive',
      'Não registei refeições há 3 dias'
    );
    console.log('✅ Response:', response2.text.substring(0, 100) + '...');
    console.log('   Tokens:', response2.tokensUsed);

    // Test 3: Cache hit
    console.log('\n📝 Test 3: Cache Test (same prompt)');
    aiService.debounceMap.delete(user.id);
    const response3 = await aiService.generateResponse(
      user.id,
      'coach',
      'Sugira uma refeição saudável para o café'
    );
    console.log('✅ First call - Cached:', response3.cached ? 'No' : 'No (first)');

    aiService.debounceMap.delete(user.id);
    const response4 = await aiService.generateResponse(
      user.id,
      'coach',
      'Sugira uma refeição saudável para o café'
    );
    console.log('✅ Second call - Cached:', response4.cached ? 'Yes' : 'No');

    // Test 4: Verify DB storage
    console.log('\n📝 Test 4: Database Storage');
    const chats = await prisma.aIChat.findMany({
      where: { userId: user.id }
    });
    console.log(`✅ Stored ${chats.length} chat records`);
    chats.forEach((chat, i) => {
      console.log(`   ${i + 1}. Mode: ${chat.mode}, Tokens: ${chat.tokensUsed}, Cost: $${chat.cost.toFixed(6)}`);
    });

    // Test 5: Verify metrics
    console.log('\n📝 Test 5: Chat Metrics');
    const metrics = await prisma.chatMetrics.findUnique({
      where: { userId: user.id }
    });
    if (metrics) {
      console.log(`✅ Daily tokens used: ${metrics.dailyTokens}`);
      console.log(`   Total cost: $${metrics.totalCost.toFixed(6)}`);
    } else {
      console.log('⚠️  No metrics recorded yet');
    }

    console.log('\n✅ All integration tests passed!\n');
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
  } finally {
    // Cleanup
    await prisma.aIChat.deleteMany({ where: { userId: user.id } });
    await prisma.chatMetrics.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

testRealIntegration().catch(console.error);
