import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
export function loadVCFandSaveEnv(filePath, envFile = ".env") {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Arquivo não encontrado: ${absolutePath}`);
    }
    const data = fs.readFileSync(absolutePath, "utf-8");
    // Regex para capturar todos os números depois de TEL:
    const regex = /TEL[^:]*:(\+?\d+)/g;
    const numbers = [];
    let match;
    while ((match = regex.exec(data)) !== null) {
        const raw = match[1]; // pode existir porque o regex tem um grupo de captura
        if (raw) {
            const cleaned = raw.replace(/[^0-9]/g, "");
            if (cleaned) {
                numbers.push(cleaned);
            }
        }
    }
    // Salva no .env
    const envPath = path.resolve(process.cwd(), envFile);
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
    // Remove linha antiga de CONTACTS (se existir)
    envContent = envContent.replace(/^CONTACTS=.*$/m, "");
    // Adiciona a nova lista
    envContent += `\nCONTACTS=${numbers.join(",")}\n`;
    fs.writeFileSync(envPath, envContent.trim() + "\n");
    console.log("✅ Contatos extraídos e salvos no .env:", numbers.length);
    return numbers;
}
//# sourceMappingURL=contatos.js.map