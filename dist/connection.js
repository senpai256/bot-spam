import { DisconnectReason, makeWASocket, useMultiFileAuthState, } from "baileys";
import pino from "pino";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger, question } from "./exports/index.js";
import { loadVCFandSaveEnv } from "./contatos.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Função auxiliar para escolher item aleatório de um array
function pickRandom(arr) {
    return arr.length > 0 ? (arr[Math.floor(Math.random() * arr.length)] ?? "") : "";
}
export async function riko() {
    const { state, saveCreds } = await useMultiFileAuthState(path.resolve(__dirname, "../database/qr-code"));
    const reng = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "100.0.4896.127"],
        markOnlineOnConnect: true,
        logger,
        syncFullHistory: true,
    });
    // Atualizações de conexão
    reng.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const sholdReconnect = lastDisconnect?.error?.statusCode !== DisconnectReason.loggedOut;
            console.log("Conexão fechada, motivo: ", lastDisconnect?.error, ", reconectar? ", sholdReconnect);
            if (sholdReconnect) {
                riko();
            }
        }
        else if (connection === "open") {
            console.log("Conectado com sucesso!");
        }
    });
    // Emparelhamento se não registrado
    if (!state.creds?.registered) {
        let phoneNumber = await question("Digite o numero do telefone com o codigo do pais (ex: 5511999999999): ");
        phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
        if (!phoneNumber) {
            throw new Error("Número de telefone inválido");
        }
        const code = await reng.requestPairingCode(phoneNumber);
        console.log(`Código de emparelhamento enviado para ${phoneNumber}: ${code}`);
    }
    // Salva credenciais quando atualizadas
    reng.ev.on("creds.update", saveCreds);
    // Evento de mensagens
    reng.ev.on("messages.upsert", async (m) => {
        const messages = m.messages;
        for (const msg of messages) {
            if (!msg.message || msg.key.fromMe)
                continue;
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
            if (!text)
                continue;
            // Comando .span
            if (text.trim() === ".span") {
                const numbers = (process.env.CONTACTS?.split(",") ?? []);
                const emojis = (process.env.EMOJIS?.split(",") ?? ["✨", "🎉", "🚀", "👍"]);
                console.log("📤 Comando .span recebido. Enviando mensagens dinamicamente...");
                let count = 0;
                for (const number of numbers) {
                    const jid = `${number.trim()}@s.whatsapp.net`;
                    // Gera uma mensagem com vários emojis aleatórios
                    const randomEmojis = Array.from({ length: 3 }, () => pickRandom(emojis)).join(" ");
                    // Mensagem com formato exato que você pediu
                    const message = `
Ei, ficou sabendo?? 

Que você foi selecionado para o Festival de Ofertas no Instituto Mix  Tailandia,  ENCERRA: Hoje! ${randomEmojis} Responda SIM, que te explico agora mesmo seus benefícios.
                    `;
                    const buttonMessage = {
                        text: message,
                        footer: "Instituto Mix - Festival de Ofertas",
                        buttons: [
                            {
                                buttonId: "ler_mais_button",
                                buttonText: {
                                    displayText: "Ler mais",
                                },
                                type: 1,
                            },
                        ],
                        headerType: 1,
                    };
                    try {
                        await reng.sendMessage(jid, buttonMessage);
                        console.log(`✅ Mensagem enviada para ${number}: "${message}"`);
                    }
                    catch (err) {
                        console.error(`❌ Erro ao enviar para ${number}:`, err);
                    }
                    count++;
                    // Pausa a cada 4 mensagens
                    if (count % 4 === 0) {
                        console.log("⏳ Pausando 1 minuto...");
                        await new Promise((res) => setTimeout(res, 60000)); // Pausa de 1 minuto
                    }
                }
                console.log("🚀 Envio finalizado!");
            }
        }
    });
    // Carregar contatos de VCF opcional
    //const contatos = loadVCFandSaveEnv(path.resolve(__dirname, "../database/contacts.vcf"));
}
//# sourceMappingURL=connection.js.map