
import { oracleService } from './oracle-db';

export interface Lead {
  CODLEAD: string
  ID_EMPRESA: number
  NOME: string
  DESCRICAO: string
  VALOR: number
  ESTAGIO: string
  CODESTAGIO: string
  CODFUNIL: string
  DATA_VENCIMENTO: string
  TIPO_TAG: string
  COR_TAG: string
  CODPARC?: string
  CODUSUARIO?: number
  ATIVO: string
  DATA_CRIACAO: string
  DATA_ATUALIZACAO: string
  STATUS_LEAD?: 'EM_ANDAMENTO' | 'GANHO' | 'PERDIDO'
  MOTIVO_PERDA?: string
  DATA_CONCLUSAO?: string
}

export interface LeadProduto {
  CODITEM?: string
  CODLEAD: string
  ID_EMPRESA: number
  CODPROD: number
  DESCRPROD: string
  QUANTIDADE: number
  VLRUNIT: number
  VLRTOTAL: number
  ATIVO?: string
  DATA_INCLUSAO?: string
}

export interface LeadAtividade {
  CODATIVIDADE: string
  CODLEAD: string
  ID_EMPRESA: number
  TIPO: 'LIGACAO' | 'EMAIL' | 'REUNIAO' | 'VISITA' | 'PEDIDO' | 'CLIENTE' | 'NOTA' | 'WHATSAPP' | 'PROPOSTA'
  DESCRICAO: string
  DATA_HORA: string
  DATA_INICIO: string
  DATA_FIM: string
  CODUSUARIO: number
  DADOS_COMPLEMENTARES?: string
  NOME_USUARIO?: string
  COR?: string
  ORDEM?: number
  ATIVO?: string
  STATUS?: 'AGUARDANDO' | 'ATRASADO' | 'REALIZADO'
}

// ==================== LEADS ====================

export async function consultarLeads(idEmpresa: number, codUsuario?: number, isAdmin: boolean = false): Promise<Lead[]> {
  console.log('🔍 [Oracle] Consultando leads:', { idEmpresa, codUsuario, isAdmin });

  try {
    let sql = `
      SELECT 
        CODLEAD,
        ID_EMPRESA,
        NOME,
        DESCRICAO,
        VALOR,
        CODESTAGIO,
        CODFUNIL,
        TO_CHAR(DATA_VENCIMENTO, 'DD/MM/YYYY') AS DATA_VENCIMENTO,
        TIPO_TAG,
        COR_TAG,
        CODPARC,
        CODUSUARIO,
        ATIVO,
        TO_CHAR(DATA_CRIACAO, 'DD/MM/YYYY') AS DATA_CRIACAO,
        TO_CHAR(DATA_ATUALIZACAO, 'DD/MM/YYYY') AS DATA_ATUALIZACAO,
        STATUS_LEAD,
        MOTIVO_PERDA,
        TO_CHAR(DATA_CONCLUSAO, 'DD/MM/YYYY') AS DATA_CONCLUSAO
      FROM AD_LEADS
      WHERE ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
    `;

    const params: any = { idEmpresa };

    // Se não é admin, filtrar por usuário
    if (!isAdmin && codUsuario) {
      sql += ` AND CODUSUARIO = :codUsuario`;
      params.codUsuario = codUsuario;
    }

    sql += ` ORDER BY DATA_CRIACAO DESC`;

    const result = await oracleService.executeQuery<Lead>(sql, params);
    console.log(`✅ [Oracle] ${result.length} leads encontrados`);
    return result;

  } catch (error) {
    console.error('❌ [Oracle] Erro ao consultar leads:', error);
    throw error;
  }
}

export async function salvarLead(lead: Partial<Lead>, idEmpresa: number, codUsuarioCriador?: number): Promise<Lead> {
  console.log('💾 [Oracle] Salvando lead:', { lead, idEmpresa, codUsuarioCriador });

  try {
    const isUpdate = !!lead.CODLEAD;

    if (isUpdate) {
      // Atualizar lead existente
      const sql = `
        UPDATE AD_LEADS
        SET NOME = :nome,
            DESCRICAO = :descricao,
            VALOR = :valor,
            CODESTAGIO = :codEstagio,
            CODFUNIL = :codFunil,
            DATA_VENCIMENTO = TO_DATE(:dataVencimento, 'DD/MM/YYYY'),
            TIPO_TAG = :tipoTag,
            COR_TAG = :corTag,
            CODPARC = :codParc
        WHERE CODLEAD = :codLead
          AND ID_EMPRESA = :idEmpresa
      `;

      await oracleService.executeQuery(sql, {
        nome: lead.NOME,
        descricao: lead.DESCRICAO || null,
        valor: lead.VALOR || 0,
        codEstagio: lead.CODESTAGIO || null,
        codFunil: lead.CODFUNIL || null,
        dataVencimento: lead.DATA_VENCIMENTO || null,
        tipoTag: lead.TIPO_TAG || null,
        corTag: lead.COR_TAG || '#3b82f6',
        codParc: lead.CODPARC || null,
        codLead: lead.CODLEAD,
        idEmpresa
      });

      console.log(`✅ [Oracle] Lead ${lead.CODLEAD} atualizado`);

      // Buscar lead atualizado
      const leadAtualizado = await oracleService.executeOne<Lead>(
        `SELECT * FROM AD_LEADS WHERE CODLEAD = :codLead`,
        { codLead: lead.CODLEAD }
      );

      return leadAtualizado!;

    } else {
      // Inserir novo lead
      const sql = `
        INSERT INTO AD_LEADS (
          ID_EMPRESA, NOME, DESCRICAO, VALOR, CODESTAGIO, CODFUNIL,
          DATA_VENCIMENTO, TIPO_TAG, COR_TAG, CODPARC, CODUSUARIO,
          ATIVO, STATUS_LEAD
        ) VALUES (
          :idEmpresa, :nome, :descricao, :valor, :codEstagio, :codFunil,
          TO_DATE(:dataVencimento, 'DD/MM/YYYY'), :tipoTag, :corTag, :codParc,
          :codUsuario, 'S', 'EM_ANDAMENTO'
        )
      `;

      await oracleService.executeQuery(sql, {
        idEmpresa,
        nome: lead.NOME,
        descricao: lead.DESCRICAO || null,
        valor: lead.VALOR || 0,
        codEstagio: lead.CODESTAGIO || null,
        codFunil: lead.CODFUNIL || null,
        dataVencimento: lead.DATA_VENCIMENTO || null,
        tipoTag: lead.TIPO_TAG || null,
        corTag: lead.COR_TAG || '#3b82f6',
        codParc: lead.CODPARC || null,
        codUsuario: codUsuarioCriador || null
      });

      console.log(`✅ [Oracle] Novo lead criado`);

      // Buscar último lead criado
      const novoLead = await oracleService.executeOne<Lead>(
        `SELECT * FROM AD_LEADS WHERE ID_EMPRESA = :idEmpresa ORDER BY CODLEAD DESC FETCH FIRST 1 ROWS ONLY`,
        { idEmpresa }
      );

      return novoLead!;
    }

  } catch (error) {
    console.error('❌ [Oracle] Erro ao salvar lead:', error);
    throw error;
  }
}

export async function atualizarEstagioLead(codLead: string, novoEstagio: string, idEmpresa: number): Promise<Lead | undefined> {
  console.log('🔄 [Oracle] Atualizando estágio do lead:', { codLead, novoEstagio, idEmpresa });

  try {
    const sql = `
      UPDATE AD_LEADS
      SET CODESTAGIO = :novoEstagio
      WHERE CODLEAD = :codLead
        AND ID_EMPRESA = :idEmpresa
    `;

    await oracleService.executeQuery(sql, { novoEstagio, codLead, idEmpresa });
    console.log(`✅ [Oracle] Estágio do lead ${codLead} atualizado`);

    // Buscar lead atualizado
    const leadAtualizado = await oracleService.executeOne<Lead>(
      `SELECT * FROM AD_LEADS WHERE CODLEAD = :codLead`,
      { codLead }
    );

    return leadAtualizado!;

  } catch (error) {
    console.error('❌ [Oracle] Erro ao atualizar estágio:', error);
    throw error;
  }
}

export async function deletarLead(codLead: string, idEmpresa: number): Promise<void> {
  console.log('🗑️ [Oracle] Deletando lead:', { codLead, idEmpresa });

  try {
    const sql = `
      UPDATE AD_LEADS
      SET ATIVO = 'N'
      WHERE CODLEAD = :codLead
        AND ID_EMPRESA = :idEmpresa
    `;

    await oracleService.executeQuery(sql, { codLead, idEmpresa });
    console.log(`✅ [Oracle] Lead ${codLead} deletado`);

  } catch (error) {
    console.error('❌ [Oracle] Erro ao deletar lead:', error);
    throw error;
  }
}

// ==================== PRODUTOS DOS LEADS ====================

export async function consultarProdutosLead(codLead: string, idEmpresa: number): Promise<LeadProduto[]> {
  console.log('🔍 [Oracle] Consultando produtos do lead:', { codLead, idEmpresa });

  try {
    const sql = `
      SELECT 
        CODITEM,
        CODLEAD,
        ID_EMPRESA,
        CODPROD,
        DESCRPROD,
        QUANTIDADE,
        VLRUNIT,
        VLRTOTAL,
        ATIVO,
        TO_CHAR(DATA_INCLUSAO, 'DD/MM/YYYY') AS DATA_INCLUSAO
      FROM AD_ADLEADSPRODUTOS
      WHERE CODLEAD = :codLead
        AND ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
    `;

    const result = await oracleService.executeQuery<LeadProduto>(sql, { codLead, idEmpresa });
    console.log(`✅ [Oracle] ${result.length} produtos encontrados`);
    return result;

  } catch (error) {
    console.error('❌ [Oracle] Erro ao consultar produtos do lead:', error);
    throw error;
  }
}

export async function adicionarProdutoLead(produto: Omit<LeadProduto, 'CODITEM' | 'DATA_INCLUSAO'>, idEmpresa: number): Promise<void> {
  console.log('➕ [Oracle] Adicionando produto ao lead:', { produto, idEmpresa });

  try {
    const sql = `
      INSERT INTO AD_ADLEADSPRODUTOS (
        CODLEAD, ID_EMPRESA, CODPROD, DESCRPROD, QUANTIDADE, VLRUNIT, VLRTOTAL, ATIVO
      ) VALUES (
        :codLead, :idEmpresa, :codProd, :descrProd, :quantidade, :vlrUnit, :vlrTotal, 'S'
      )
    `;

    await oracleService.executeQuery(sql, {
      codLead: produto.CODLEAD,
      idEmpresa,
      codProd: produto.CODPROD,
      descrProd: produto.DESCRPROD,
      quantidade: produto.QUANTIDADE,
      vlrUnit: produto.VLRUNIT,
      vlrTotal: produto.VLRTOTAL
    });

    console.log(`✅ [Oracle] Produto adicionado ao lead`);

  } catch (error) {
    console.error('❌ [Oracle] Erro ao adicionar produto ao lead:', error);
    throw error;
  }
}

export async function removerProdutoLead(codItem: string, codLead: string, idEmpresa: number): Promise<{ novoValorTotal: number }> {
  console.log('➖ [Oracle] Removendo produto do lead:', { codItem, codLead, idEmpresa });

  try {
    // Inativar produto
    await oracleService.executeQuery(
      `UPDATE AD_ADLEADSPRODUTOS SET ATIVO = 'N' WHERE CODITEM = :codItem AND ID_EMPRESA = :idEmpresa`,
      { codItem, idEmpresa }
    );

    // Recalcular valor total
    const totalResult = await oracleService.executeOne<{ TOTAL: number }>(
      `SELECT NVL(SUM(VLRTOTAL), 0) AS TOTAL FROM AD_ADLEADSPRODUTOS WHERE CODLEAD = :codLead AND ID_EMPRESA = :idEmpresa AND ATIVO = 'S'`,
      { codLead, idEmpresa }
    );

    const novoValorTotal = totalResult?.TOTAL || 0;

    // Atualizar valor do lead
    await oracleService.executeQuery(
      `UPDATE AD_LEADS SET VALOR = :valor WHERE CODLEAD = :codLead AND ID_EMPRESA = :idEmpresa`,
      { valor: novoValorTotal, codLead, idEmpresa }
    );

    console.log(`✅ [Oracle] Produto removido e valor atualizado`);
    return { novoValorTotal };

  } catch (error) {
    console.error('❌ [Oracle] Erro ao remover produto do lead:', error);
    throw error;
  }
}

// ==================== ATIVIDADES DOS LEADS ====================

export async function consultarAtividades(codLead: string, idEmpresa: number, ativo: string = 'S'): Promise<LeadAtividade[]> {
  console.log('🔍 [Oracle] Consultando atividades:', { codLead, idEmpresa, ativo });

  try {
    let sql = `
      SELECT 
        CODATIVIDADE,
        CODLEAD,
        ID_EMPRESA,
        TIPO,
        DESCRICAO,
        TO_CHAR(DATA_HORA, 'DD/MM/YYYY HH24:MI:SS') AS DATA_HORA,
        TO_CHAR(DATA_INICIO, 'DD/MM/YYYY HH24:MI:SS') AS DATA_INICIO,
        TO_CHAR(DATA_FIM, 'DD/MM/YYYY HH24:MI:SS') AS DATA_FIM,
        CODUSUARIO,
        DADOS_COMPLEMENTARES,
        COR,
        ORDEM,
        ATIVO,
        STATUS
      FROM AD_ADLEADSATIVIDADES
      WHERE ID_EMPRESA = :idEmpresa
        AND ATIVO = :ativo
    `;

    const params: any = { idEmpresa, ativo };

    if (codLead) {
      sql += ` AND CODLEAD = :codLead`;
      params.codLead = codLead;
    }

    sql += ` ORDER BY ORDEM DESC`;

    const result = await oracleService.executeQuery<LeadAtividade>(sql, params);
    console.log(`✅ [Oracle] ${result.length} atividades encontradas`);
    return result;

  } catch (error) {
    console.error('❌ [Oracle] Erro ao consultar atividades:', error);
    throw error;
  }
}

export async function criarAtividade(atividade: Partial<LeadAtividade>, idEmpresa: number): Promise<LeadAtividade> {
  console.log('➕ [Oracle] Criando atividade:', { atividade, idEmpresa });

  try {
    // Buscar maior ordem
    const ordemResult = await oracleService.executeOne<{ ORDEM: number }>(
      atividade.CODLEAD 
        ? `SELECT NVL(MAX(ORDEM), 0) AS ORDEM FROM AD_ADLEADSATIVIDADES WHERE CODLEAD = :codLead AND ID_EMPRESA = :idEmpresa`
        : `SELECT NVL(MAX(ORDEM), 0) AS ORDEM FROM AD_ADLEADSATIVIDADES WHERE ID_EMPRESA = :idEmpresa`,
      atividade.CODLEAD ? { codLead: atividade.CODLEAD, idEmpresa } : { idEmpresa }
    );

    const novaOrdem = (ordemResult?.ORDEM || 0) + 1;

    // Determinar status
    const dataInicio = atividade.DATA_INICIO ? new Date(atividade.DATA_INICIO) : new Date();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataInicio.setHours(0, 0, 0, 0);
    const statusInicial = dataInicio < hoje ? 'ATRASADO' : 'AGUARDANDO';

    const sql = `
      INSERT INTO AD_ADLEADSATIVIDADES (
        CODLEAD, ID_EMPRESA, TIPO, DESCRICAO, DATA_INICIO, DATA_FIM,
        CODUSUARIO, DADOS_COMPLEMENTARES, COR, ORDEM, ATIVO, STATUS
      ) VALUES (
        :codLead, :idEmpresa, :tipo, :descricao, 
        TO_TIMESTAMP(:dataInicio, 'DD/MM/YYYY HH24:MI:SS'),
        TO_TIMESTAMP(:dataFim, 'DD/MM/YYYY HH24:MI:SS'),
        :codUsuario, :dadosComplementares, :cor, :ordem, 'S', :status
      )
    `;

    await oracleService.executeQuery(sql, {
      codLead: atividade.CODLEAD || null,
      idEmpresa,
      tipo: atividade.TIPO,
      descricao: atividade.DESCRICAO || null,
      dataInicio: atividade.DATA_INICIO || new Date().toISOString(),
      dataFim: atividade.DATA_FIM || atividade.DATA_INICIO || new Date().toISOString(),
      codUsuario: atividade.CODUSUARIO,
      dadosComplementares: atividade.DADOS_COMPLEMENTARES || null,
      cor: atividade.COR || null,
      ordem: novaOrdem,
      status: statusInicial
    });

    console.log(`✅ [Oracle] Atividade criada`);

    // Buscar atividade criada
    const atividades = await consultarAtividades(atividade.CODLEAD || '', idEmpresa);
    return atividades[0];

  } catch (error) {
    console.error('❌ [Oracle] Erro ao criar atividade:', error);
    throw error;
  }
}
