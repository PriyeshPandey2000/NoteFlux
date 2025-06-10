import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { command, content, htmlContent } = await request.json();

    if (!command || !content) {
      return NextResponse.json(
        { error: 'Command and content are required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a smart text formatting assistant. Users will give you voice commands to format specific parts of their text content. Your job is to:

1. Understand the user's intent from their voice command
2. Identify which part of the content they want to modify
3. Apply the appropriate HTML formatting
4. Return the complete formatted HTML content

FORMATTING RULES:
- Bold: <strong>text</strong>
- Italic: <em>text</em>
- Heading 1: <h1>text</h1>
- Heading 2: <h2>text</h2>
- Heading 3: <h3>text</h3>
- Bullet list: <ul><li>item</li></ul>
- Numbered list: <ol><li>item</li></ol>
- Quote: <blockquote>text</blockquote>
- Paragraph: <p>text</p>
- Center align: <p style="text-align: center">text</p>
- Left align: <p style="text-align: left">text</p>
- Right align: <p style="text-align: right">text</p>

IMPORTANT:
- Only modify the specific part mentioned in the command
- Keep all other content exactly the same
- If you can't identify the specific part, don't make changes
- Preserve existing formatting unless specifically asked to change it
- Return valid HTML that can be used in a rich text editor

Examples:
- "Make the introduction bold" → Find intro paragraph and wrap in <strong>
- "Turn the first paragraph into a heading" → Convert first <p> to <h1> or <h2>
- "Add bullet points to the list" → Convert text to <ul><li> format
- "Make the title a heading one" → Find title and make it <h1>`;

    const userPrompt = `Voice Command: "${command}"

Current Content (plain text):
${content}

Current HTML Content:
${htmlContent}

Please apply the formatting command and return the complete updated HTML content. If you cannot identify the specific part to modify or the command is unclear, return the original HTML unchanged.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Extract HTML content from the response
    let newHtmlContent = response.trim();
    
    // If the response is wrapped in code blocks, extract the HTML
    if (newHtmlContent.startsWith('```html')) {
      newHtmlContent = newHtmlContent.replace(/```html\n?/, '').replace(/\n?```$/, '');
    } else if (newHtmlContent.startsWith('```')) {
      newHtmlContent = newHtmlContent.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    // Basic validation - check if it looks like HTML
    const hasHtmlTags = /<[^>]+>/.test(newHtmlContent);
    
    if (!hasHtmlTags) {
      // If no HTML tags, assume it's plain text and wrap in paragraph
      newHtmlContent = `<p>${newHtmlContent}</p>`;
    }

    return NextResponse.json({
      success: true,
      newHtmlContent,
      originalCommand: command,
    });

  } catch (error) {
    console.error('Error processing voice command:', error);
    return NextResponse.json(
      { error: 'Failed to process voice command' },
      { status: 500 }
    );
  }
} 