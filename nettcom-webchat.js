(function () {
  const scriptTag = document.currentScript;
  const iconUrl = scriptTag.getAttribute("data-icon") || "https://nettcom.com.br/images/favicofull.ico";
  const webhook = scriptTag.getAttribute("data-webhook");
  const abrirChat10s = scriptTag.getAttribute("data-abrirChat_10s") === "true";


  const style = document.createElement("style");
  style.textContent = `
    #floatingChatButton {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: none;
      border: none;
      cursor: pointer;
      z-index: 9999;
    }
    #floatingChatButton img { width: 100%; height: 100%; object-fit: contain; }

    #chatContainer {
      display: none;
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      height: 480px;
      background-color: white;
      border-radius: 16px;
      box-shadow: 0 5px 25px rgba(0,0,0,0.1);
      overflow: hidden;
      z-index: 9999;
      flex-direction: column;
      font-family: Arial, sans-serif;
    }

    .chat-active-header {
      background-color: #1f93ff;
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chat-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background-color: #f8f9fa;
      display: flex;
      flex-direction: column;
    }

    .message { margin-bottom: 12px; padding: 8px 12px; border-radius: 18px; max-width: 80%; word-wrap: break-word; }
    .message.bot { background-color: #e9ecef; align-self: flex-start; }
    .message.user { background-color: #1f93ff; color: white; align-self: flex-end; }

    .chat-input-container {
      padding: 12px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
    }

    .chat-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 20px;
    }

    .send-button {
      background-color: #1f93ff;
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: white;
    }
  `;
  document.head.appendChild(style);

  // HTML do chat
  document.body.insertAdjacentHTML("beforeend", `
    <div id="floatingChatButton">
      <img src="${iconUrl}" alt="Chat">
    </div>
    <div id="chatContainer" style="display: none;">
      <div class="chat-active-header">
        <h2 style="margin:0; font-size:16px;">nettcom.io</h2>
        <button class="close-button" onclick="document.getElementById('chatContainer').style.display='none';document.getElementById('floatingChatButton').style.display='block'">×</button>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="chat-input-container">
        <input type="text" class="chat-input" id="chatInput" placeholder="Digite sua mensagem..." onkeypress="if(event.key==='Enter') enviarMensagem()">
        <button class="send-button" onclick="enviarMensagem()">▶</button>
      </div>
    </div>
  `);

  // Define sessionId logo no início
  let sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  let chatIniciado = false;
  const chatContainer = document.getElementById('chatContainer');
  const chatMessages = document.getElementById('chatMessages');
  let ultimasMensagens = [];

  async function enviarMensagemInicial() {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: "startMessage", sessionId, chatInput: "Chat iniciado" })
    });
    const data = await res.json();
    const msg = data.output || data.message || data.response;
    if (msg) adicionarMensagem(msg, 'bot');

    // ✅ Agora sim: iniciar verificação de mensagens após webhook inicial
    setInterval(verificarNovasMensagens, 3000);
  }

  // Envia mensagem ao carregar
  enviarMensagemInicial();

  function adicionarMensagem(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    chatMessages.appendChild(div);
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 100);
  }

  async function enviarMensagem() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    adicionarMensagem(message, 'user');
    input.value = '';
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: "sendMessage", sessionId, chatInput: message })
    });
    const data = await res.json();
    const msg = data.output || data.message || data.response;
    if (msg) adicionarMensagem(msg, 'bot');
  }

  window.enviarMensagem = enviarMensagem;

  function abrirChat() {
    chatContainer.style.display = 'flex';
    document.getElementById('floatingChatButton').style.display = 'none';
  }

  document.getElementById('floatingChatButton').addEventListener('click', abrirChat);

  if (abrirChat10s) {
    setTimeout(() => {
      if (!chatIniciado) abrirChat();
    }, 10000);
  }

  async function verificarNovasMensagens() {
    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: "checkNew", sessionId })
      });
      const data = await response.json();

      if (data.output && typeof data.output === "string") {
        adicionarMensagem(data.output.trim(), 'bot');
      }

      if (Array.isArray(data.mensagens) && data.mensagens.length > 0) {
        data.mensagens.forEach(msg => {
          if (!ultimasMensagens.includes(msg.id)) {
            adicionarMensagem(msg.texto, 'bot');
            ultimasMensagens.push(msg.id);
          }
        });
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  }

setInterval(verificarNovasMensagens, 3000);

})();
