module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Use POST method' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'API key not configured' });
  }

  try {
    const { prompt, type } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    let systemPrompt = '';
    
    if (type === 'enhance') {
      systemPrompt = `You are an AI image prompt expert. Enhance this basic prompt into a detailed, professional prompt for AI image generation. Add lighting, camera angle, style, mood, and quality modifiers. Output ONLY the enhanced prompt, nothing else. Keep it under 150 words.

Basic prompt: "${prompt}"

Enhanced prompt:`;
    } else if (type === 'analyze') {
      systemPrompt = `Analyze this AI image prompt. Give a score out of 10, list strengths, missing elements, and suggestions. Be concise.

Prompt: "${prompt}"`;
    } else if (type === 'variations') {
      systemPrompt = `Create 3 variations of this AI image prompt with different styles/moods. Format as:
1. [variation 1]
2. [variation 2]  
3. [variation 3]

Original: "${prompt}"`;
    } else if (type === 'negative') {
      systemPrompt = `Suggest negative prompts (things to exclude) for this AI image prompt. Output as comma-separated list.

Prompt: "${prompt}"`;
    } else {
      systemPrompt = `Enhance this AI image prompt with more details: "${prompt}"`;
    }

    // Try multiple free models
    const models = [
      'mistralai/mistral-7b-instruct:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'google/gemma-3-4b-it:free',
      'qwen/qwen3-4b:free'
    ];

    let lastError = null;

    for (const model of models) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://promptcraftsai.vercel.app',
            'X-Title': 'PromptCraft AI'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'user', content: systemPrompt }
            ],
            max_tokens: 1024,
            temperature: 0.8
          })
        });

        const data = await response.json();

        // Check if successful
        if (data.choices && data.choices[0]?.message?.content) {
          return res.status(200).json({ 
            success: true, 
            result: data.choices[0].message.content.trim(),
            type: type || 'enhance',
            model: model
          });
        }

        // Store error and try next model
        lastError = data.error?.message || JSON.stringify(data);

      } catch (e) {
        lastError = e.message;
      }
    }

    // All models failed
    return res.status(500).json({ 
      success: false, 
      error: lastError || 'All models failed',
      triedModels: models
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'AI processing failed'
    });
  }
};