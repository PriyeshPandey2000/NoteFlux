import { getSession } from 'next-auth/react';
import axios from 'axios';
import { NextResponse } from 'next/server';

export async function POST(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const { transcript } = req.body;

  try {
    const notionPage = {
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        title: {
          title: [
            {
              text: {
                content: "Transcript"
              }
            }
          ]
        }
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            text: [
              {
                type: "text",
                text: {
                  content: transcript
                }
              }
            ]
          }
        }
      ]
    };

    await axios.post('https://api.notion.com/v1/pages', notionPage, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2021-08-16'
      }
    });

    return NextResponse.json({ message: 'Transcript saved to Notion' }, { status: 200 });
  } catch (error) {
    console.error('Error saving transcript to Notion:', error);
    return NextResponse.json({ message: 'Failed to save transcript to Notion' }, { status: 500 });
  }
}
