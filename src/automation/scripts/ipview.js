// Função principal que faz todo o trabalho.
function showIpDisplay() {
    // Evita adicionar o display de IP múltiplas vezes se o script for injetado mais de uma vez por engano.
    if (document.getElementById('my-ip-viewer-container')) {
        return;
    }

    fetch("https://api.ipify.org?format=json")
        .then((response) => response.json())
        .then((data) => {
            const container = document.createElement("div");
            container.id = 'my-ip-viewer-container'; // Adiciona um ID para verificação
            container.style.position = "fixed";
            container.style.bottom = "10px";
            container.style.right = "10px";
            container.style.zIndex = "2147483647"; // Z-index máximo para ficar sempre na frente
            container.style.pointerEvents = "none";

            const shadowRoot = container.attachShadow({ mode: "open" });

            const style = document.createElement("style");
            style.textContent = `
              div {
                background-color: rgba(0, 0, 0, 0.8);
                color: #fff;
                padding: 5px 10px;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                pointer-events: none;
              }
            `;

            const ipBox = document.createElement("div");
            ipBox.textContent = `IP: ${data.ip}`;

            shadowRoot.appendChild(style);
            shadowRoot.appendChild(ipBox);
            document.body.appendChild(container);
        })
        .catch((error) => console.error("IpView.js: Erro ao obter IP:", error));
}

// A MUDANÇA MAIS IMPORTANTE ESTÁ AQUI:
// Verificamos o estado do documento.
// Se ele já estiver carregado, executamos a função imediatamente.
if (document.readyState === 'loading') {
    // Se ainda estiver carregando, esperamos pelo evento DOMContentLoaded.
    document.addEventListener('DOMContentLoaded', showIpDisplay);
} else {
    // Se já carregou, a função pode ser chamada com segurança.
    showIpDisplay();
}