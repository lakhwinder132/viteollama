import ReactMarkdown from "react-markdown";
import "./App.css";
import { useState } from "react";

const OLLAMA_URL = "http://15.252.164.27:11434";
const MODEL = "qwen3:1.7b";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [send, setSend] = useState(false);

  const handleChange = (e) => {
    setPrompt(e.target.value);
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || send) {
      return;
    }

    setSend(true);
    setResponse("");

    try {
      const result = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: MODEL,

          messages: [
            {
              role: "system",

              content: `
You are a helpful AI weather and farming assistant.

You can answer general questions, but you are especially useful for:

- Weather
- Farming
- Crops
- Irrigation
- Soil
- Fertilizers
- Pesticides
- Crop diseases
- Agricultural practices
- Punjab farming

Keep answers clear, practical, and concise.

If the user asks about weather but does not provide a location,
ask them to provide the location.

Do not invent live weather information.

If you do not know something, clearly say that you do not know.
`,
            },

            {
              role: "user",
              content: prompt,
            },
          ],

          stream: true,

          think: false,
        }),
      });

      if (!result.ok) {
        const errorText = await result.text();

        throw new Error(
          `Ollama error ${result.status}: ${errorText}`
        );
      }

      if (!result.body) {
        throw new Error("Ollama did not return a stream.");
      }

      const reader = result.body.getReader();
      const decoder = new TextDecoder();

      let fullResponse = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, {
          stream: true,
        });

        if (!chunk) {
          continue;
        }

        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          try {
            const data = JSON.parse(line);

            const content = data?.message?.content;

            if (content) {
              fullResponse += content;

              setResponse(fullResponse);
            }

            if (data.done) {
              break;
            }
          } catch (error) {
            console.log("Waiting for next chunk...");
          }
        }
      }

      const remaining = decoder.decode();

      if (remaining) {
        const lines = remaining.split("\n");

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          try {
            const data = JSON.parse(line);

            const content = data?.message?.content;

            if (content) {
              fullResponse += content;

              setResponse(fullResponse);
            }
          } catch {
            // Ignore incomplete data
          }
        }
      }
    } catch (error) {
      console.error("Ollama error:", error);

      setResponse(
        "❌ Could not connect to Ollama. Make sure Ollama is running and accessible."
      );
    } finally {
      setSend(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !send) {
      handleSubmit();
    }
  };

  return (
    <div className="app">
      <div className="weather-card">

        <div className="header">
          <div className="logo">
            🌤️
          </div>

          <div>
            <h1>Weather AI</h1>

            <p>
              Powered by Ollama
            </p>
          </div>
        </div>

        <div className="search-box">
          <input
            id="hello"
            type="text"
            placeholder="Ask something..."
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            value={prompt}
            disabled={send}
          />

          <button
            onClick={handleSubmit}
            disabled={send || !prompt.trim()}
          >
            {send ? (
              <>
                <span>
                  Generating
                </span>

                <span>
                  ...
                </span>
              </>
            ) : (
              <>
                <span>
                  Send
                </span>

                <span>
                  ➜
                </span>
              </>
            )}
          </button>
        </div>

        {(response || send) && (
          <div className="response-card">

            <div className="response-header">
              <span className="response-icon">
                🤖
              </span>

              <span>
                AI Response
              </span>
            </div>

            <div className="response-content">
              {response ? (
                <ReactMarkdown>
                  {response}
                </ReactMarkdown>
              ) : (
                <div className="loading">

                  <div className="dot"></div>

                  <div className="dot"></div>

                  <div className="dot"></div>

                  <span>
                    Connecting to Ollama...
                  </span>

                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}