# Tabbed: AI chatbot in New Tab and Sidebar

A new tab page with an AI-like user interface.
![Sample 1](./samples/Sample_1.png)
## How to run from source
### Chrome
- Run `compile.sh` to move the files from `src` to the `chrome/src` folder.
- Go to [`chrome://extensions`] and enable Developer mode
- Load the unpacked extension by selecting the `chrome/src` folder where the `manifest.json` resides.
### Firefox
- Set `xpinstall.signatures.required` to `false` from [`about:config`](about:config)
- Zip inside `src` directory as
  ```sh
  cd src
  7z a ../tabbed.zip . # or any other zip archivers, such as zipping from File Explorer
  ```
- Install the custom addon at [`about:addons`](about:addons) by selecting the zipped file
## Features
### Supported Chatbots
- [Grok](https://grok.com)
- [Copilot](https://copilot.microsoft.com)
- [ChatGPT](https:///chatgpt.com)
- [Mistral](https://mistral.ai)
- [Perplexity](https://perplexity.ai)
- [HuggingFace](https://huggingface.co/chat/)
- [Google (AI Mode)](https://google.com)
- [Gemini](https://gemini.google.com/app) (Experimental) 
- [Claude](https://claude.ai/new)(requires manual clicking)
- [Meta AI](https://meta.ai) (requires manual clicking)
### Basic
- Clean UI adapted from ChatGPT and Grok
- Ability to switch between different AI chatbots/websites
- Paste text into the prompt
- Seven default suggestion ideas to save time on commands.
  ![Sample 3](./samples/Sample_3.png)
- Click on the Extension Icon:
  - To launch your current AI chatbot in a new Tab (Chrome only)
  - To launch the sidebar (Firefox only)

### Sidebar features (Firefox Only)

- Open the sidebar to access the chatbots as well.
  ![Sample 4](./samples/Sample_4.png)
- Context menus provide suggestions as your browse
  ![Sample 5](./samples/Sample_5.png)

## Optional Features (in Options)

- Allow a custom name for greeting
- Set weather and time
- Set light/dark mode
- Set the background Image using Unsplash/Pexels, or your own image.
- Fade the chatbox after inactivity
  ![Sample 1](./samples/Sample_2.png)
