exports.handler = async (event) => {
    const PRECOS_OFICIAIS = { 1: 12.00, 2: 14.00, 3: 17.00, 4: 20.00 };

    try {
        const dados = JSON.parse(event.body);
        const { tamanhoId, carboidratos, extras } = dados;

        // 1. Validação: Exatamente 1 carboidrato
        if (carboidratos.length !== 1) {
            return {
                statusCode: 400,
                body: JSON.stringify({ sucesso: false, erro: "Selecione exatamente 1 carboidrato." })
            };
        }

        // 2. Validação: Não permitir o mesmo extra repetido
        // Criamos uma lista apenas com os IDs dos extras
        const idsExtras = extras.map(e => e.id);
        // O "Set" remove duplicatas automaticamente. 
        // Se o tamanho do Set for menor que o da lista, tinha item repetido!
        const temDuplicados = new Set(idsExtras).size !== idsExtras.length;

        if (temDuplicados) {
            return {
                statusCode: 400,
                body: JSON.stringify({ sucesso: false, erro: "Você não pode selecionar o mesmo extra duas vezes." })
            };
        }

        const valorValidado = PRECOS_OFICIAIS[tamanhoId] || 0;

        return {
            statusCode: 200,
            body: JSON.stringify({
                sucesso: true,
                valorValidado: valorValidado
            }),
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ sucesso: false, erro: "Erro no servidor." }) };
    }
};
