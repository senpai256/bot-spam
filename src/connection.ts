import { DisconnectReason, makeWASocket, useMultiFileAuthState } from "baileys";
import pino from "pino";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger, question } from "./exports/index.js";
import { loadVCFandSaveEnv } from "./contatos.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função auxiliar para escolher item aleatório de um array
function pickRandom(arr: string[]): string {
    return arr.length > 0 ? (arr[Math.floor(Math.random() * arr.length)] ?? "") : "";
}

export async function riko(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(
        path.resolve(__dirname, "../database/qr-code")
    );

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
            const sholdReconnect =
                (lastDisconnect?.error as any)?.statusCode !== DisconnectReason.loggedOut;

            console.log(
                "Conexão fechada, motivo: ",
                lastDisconnect?.error,
                ", reconectar? ",
                sholdReconnect
            );

            if (sholdReconnect) {
                riko();
            }
        } else if (connection === "open") {
            console.log("Conectado com sucesso!");
        }
    });

    // Emparelhamento se não registrado
    if (!state.creds?.registered) {
        let phoneNumber: string = await question(
            "Digite o numero do telefone com o codigo do pais (ex: 5511999999999): "
        );
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
            if (!msg.message || msg.key.fromMe) continue;

            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
            if (!text) continue;

            // Comando .span
            if (text.trim() === ".span") {
                const numbers: string[] = (process.env.CONTACTS?.split(",") ?? []) as string[];

                const messages1: string[] = (process.env.MESSAGES_1?.split(",") ?? ["Oie, tudo bem?"]) as string[];
                const messages2: string[] = (process.env.MESSAGES_2?.split(",") ?? ["Sou responsável pelas Operações Promocionais..."]) as string[];
                const messages3: string[] = (process.env.MESSAGES_3?.split(",") ?? ["Recentemente publicamos sobre o Festival de Ofertas."]) as string[];
                const messages4: string[] = (process.env.MESSAGES_4?.split(",") ?? ["Isso significa que você pode garantir uma bolsa."]) as string[];
                const messages5: string[] = (process.env.MESSAGES_5?.split(",") ?? ["Para aproveitar, basta responder com 'EU QUERO'."]) as string[];
                const emojis: string[] = (process.env.EMOJIS?.split(",") ?? ["🎉"]) as string[];

                console.log("📤 Comando .span recebido. Enviando mensagens dinamicamente...");

                let count = 0;
                for (const number of numbers) {
                    const jid = `${number.trim()}@s.whatsapp.net`;

                    // Monta mensagem aleatória
                    const message =
                        `${pickRandom(messages1)} ${pickRandom(messages2)} ${pickRandom(messages3)} ` +
                        `${pickRandom(messages4)} ${pickRandom(messages5)} ${pickRandom(emojis)}`;

                    try {
                        await reng.sendMessage(jid, { text: message });
                        console.log(`✅ Mensagem enviada para ${number}: "${message}"`);
                    } catch (err) {
                        console.error(`❌ Erro ao enviar para ${number}:`, err);
                    }

                    count++;

                    // Pausa a cada 4 mensagens
                    if (count % 4 === 0) {
                        console.log("⏳ Pausando 1 minutos...");
                        await new Promise((res) => setTimeout(res, 100000));
                    }
                }

                console.log("🚀 Envio finalizado!");
            }
        }
    });

    // Carregar contatos de VCF opcional
    const contatos = loadVCFandSaveEnv(path.resolve(__dirname, "../database/contacts.vcf"));
}
