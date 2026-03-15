exports.handler = async (event) => {
    const PRECOS_OFICIAIS = { 1: 12.00, 2: 14.00, 3: 17.00, 4: 20.00 };

    try {
        const dados = JSON.parse(event.body);
        const { tamanhoId, carboidratos, extras } = dados;

        // --- NOVA REGRA DE CARBOIDRATOS ---
        const nomesCarbos = carboidratos.map(c => c.nome.toLowerCase());
        
        // Filtramos tudo que NÃO é macarrão
        const carbosPrincipais = nomesCarbos.filter(nome => !nome.includes("macarrão"));

        // Validação:
        // 1. Não pode estar vazio (tem que ter pelo menos macarrão ou um arroz/baião)
        if (nomesCarbos.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ sucesso: false, erro: "Selecione pelo menos um carboidrato." }) };
        }

        // 2. Só pode ter no máximo UM carboidrato principal (Arroz, Baião, Grega, etc)
        // Mas o Macarrão pode estar junto com qualquer um deles.
        if (carbosPrincipais.length > 1) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ sucesso: false, erro: "Você só pode escolher um tipo de arroz/baião. O macarrão é o único que pode ser combinado." }) 
            };
        }
        // ----------------------------------

        // Validação de Extras Duplicados (mantida)
        const idsExtras = extras.map(e => e.id);
        if (new Set(idsExtras).size !== idsExtras.length) {
            return { statusCode: 400, body: JSON.stringify({ sucesso: false, erro: "Extras repetidos não são permitidos." }) };
        }

        const valorValidado = PRECOS_OFICIAIS[tamanhoId] || 0;

        return {
            statusCode: 200,
            body: JSON.stringify({ sucesso: true, valorValidado: valorValidado }),
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ sucesso: false, erro: "Erro no servidor." }) };
    }
};
