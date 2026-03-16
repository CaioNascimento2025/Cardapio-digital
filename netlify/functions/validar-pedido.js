// limpar nome
function limparNome(nome){
  if(typeof nome !== "string") return ""
  return nome
    .replace(/<[^>]*>?/gm,"")
    .replace(/[^\p{L}\s]/gu,"")
    .trim()
    .slice(0,40)
}

// limpar rua
function limparRua(rua){
  if(typeof rua !== "string") return ""
  return rua
    .replace(/<[^>]*>?/gm,"")
    .replace(/[^\p{L}\p{N}\s.,-]/gu,"")
    .trim()
    .slice(0,80)
}

exports.handler = async (event) => {
  // 🔒 PROTEÇÃO 1 — origem da requisição
  const origem = event.headers.origin || ""
  const referer = event.headers.referer || ""

  if(
    !origem.includes("cardapio-curio.netlify.app") &&
    !referer.includes("cardapio-curio.netlify.app")
  ){
    return {
      statusCode:403,
      body:JSON.stringify({
        sucesso:false,
        erro:"Acesso bloqueado"
      })
    }
  }

  // 🔒 PROTEÇÃO 2 — payload gigante
  if(event.body.length > 2000){
    return {
      statusCode:400,
      body:JSON.stringify({
        sucesso:false,
        erro:"Requisição inválida"
      })
    }
  }
  
  const PRECOS = { 1:12.00, 2:14.00, 3:17.00, 4:20.00 }
  const LIMITE_PROTEINAS = { 1:1, 2:2, 3:2, 4:3 }

  try {
    const dados = JSON.parse(event.body)
    const nomeCliente = limparNome(dados.nome)
    const ruaCliente = limparRua(dados.rua)
    const { tamanhoId, proteinas, carboidratos, extras } = dados

    // --- VALIDAÇÕES QUE VOCÊ JÁ TINHA ---
    if(!PRECOS[tamanhoId]) return { statusCode:400, body:JSON.stringify({ sucesso:false, erro:"Tamanho inválido" }) }
    
    if(!Array.isArray(proteinas) || proteinas.length !== LIMITE_PROTEINAS[tamanhoId]) {
      return { statusCode:400, body:JSON.stringify({ sucesso:false, erro:"Quantidade de proteínas inválida" }) }
    }

    if(!Array.isArray(carboidratos) || carboidratos.length === 0) {
      return { statusCode:400, body:JSON.stringify({ sucesso:false, erro:"Selecione pelo menos um carboidrato" }) }
    }

    const nomesCarbos = carboidratos.map(c => c.nome.toLowerCase())
    if(new Set(nomesCarbos).size !== nomesCarbos.length) {
      return { statusCode:400, body:JSON.stringify({ sucesso:false, erro:"Carboidratos repetidos não são permitidos" }) }
    }

    const carbosPrincipais = nomesCarbos.filter(nome => !nome.includes("macarrão"))
    if(carbosPrincipais.length > 1) {
      return { statusCode:400, body:JSON.stringify({ sucesso:false, erro:"Só é permitido um arroz/baião. Macarrão pode acompanhar." }) }
    }

    if(!Array.isArray(extras)) return { statusCode:400, body:JSON.stringify({ sucesso:false, erro:"Extras inválidos" }) }
    const idsExtras = extras.map(e => e.id)
    if(new Set(idsExtras).size !== idsExtras.length) return { statusCode:400, body:JSON.stringify({ sucesso:false, erro:"Extras repetidos" }) }
    if(extras.length > 10) return { statusCode:400, body:JSON.stringify({ sucesso:false, erro:"Extras demais" }) }

    // --- 🚀 INTEGRAÇÃO COM N8N (A MÁGICA COMEÇA AQUI) ---
    
    const webhookUrl = process.env.URL_N8N; // Puxa o link fixo do painel do Netlify

    if (!webhookUrl) {
      console.error("ERRO: URL do n8n não configurada no Netlify.");
    } else {
      // Enviando para o n8n sem travar a resposta do cliente
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataPedido: new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza" }),
            cliente: nomeCliente,
            endereco: ruaCliente,
            tamanho: tamanhoId,
            itens: {
              proteinas: proteinas.map(p => p.nome),
              carboidratos: nomesCarbos,
              extras: extras.map(e => e.nome)
            },
            total: PRECOS[tamanhoId]
          })
        });
      } catch (e) {
        console.error("Erro ao disparar n8n:", e.message);
      }
    }

    // retorno seguro para o site (o cliente recebe isso)
    return {
      statusCode:200,
      body:JSON.stringify({
        sucesso:true,
        valorValidado:PRECOS[tamanhoId],
        msg: "Pedido enviado com sucesso!"
      })
    }

  } catch (error) {
    return {
      statusCode:500,
      body:JSON.stringify({
        sucesso:false,
        erro:"Erro no servidor"
      })
    }
  }
};
