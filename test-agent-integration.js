// Test script to verify CopilotKit integration with AG-UI protocol
// This simulates what the AgentChat component does

async function testAgentIntegration() {
  console.log('Testing CopilotKit integration with AG-UI protocol...\n');

  // Test 1: Check if CopilotKit runtime endpoint is accessible
  console.log('1. Testing CopilotKit runtime endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/copilotkit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'test',
      }),
    });
    
    if (response.ok) {
      console.log('✅ CopilotKit endpoint is accessible');
    } else {
      console.log(`❌ CopilotKit endpoint returned status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ CopilotKit endpoint is not accessible:', error.message);
  }

  console.log('\n2. Checking agent registration...');
  
  // Import the agents configuration
  try {
    const { agentsIntegrations } = await import('./src/lib/agents.ts');
    console.log('✅ Found', agentsIntegrations.length, 'agent integration(s)');
    
    for (const integration of agentsIntegrations) {
      console.log(`\n   Integration: ${integration.id}`);
      const agents = await integration.agents();
      const agentNames = Object.keys(agents);
      console.log(`   Registered agents: ${agentNames.join(', ')}`);
    }
  } catch (error) {
    console.log('❌ Failed to load agents:', error.message);
  }

  console.log('\n3. Testing AG-UI protocol components...');
  
  // Check if HttpAgent is properly imported
  try {
    const { HttpAgent } = await import('@ag-ui/client');
    console.log('✅ HttpAgent from @ag-ui/client is available');
  } catch (error) {
    console.log('❌ @ag-ui/client is not installed:', error.message);
  }

  console.log('\nIntegration test complete!');
  console.log('\nNext steps:');
  console.log('1. Install Python dependencies: pip install -r src/server/services/pydantic-ai-agent/requirements.txt');
  console.log('2. Start Python backend: cd src/server/services/pydantic-ai-agent && python -m uvicorn __init__:app --port 9000');
  console.log('3. Start Next.js dev server: npm run dev');
  console.log('4. Navigate to an agent chat to test the full integration');
}

// Run the test
testAgentIntegration().catch(console.error);