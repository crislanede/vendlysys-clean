import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Servico = {
  id: string
  nome: string
  valor?: number | null
  preco?: number | null
  ativo?: boolean | null
}

type Cliente = {
  id: string
  nome: string
  telefone?: string | null
}

type Pacote = {
  id: string
  nome: string
  descricao: string | null
  valor: number | null
  validade_dias: number | null
  ativo: boolean | null
  created_at?: string | null
}

type PacoteServico = {
  id: string
  pacote_id: string
  servico_id: string
  quantidade: number
  servicos?: Servico | null
}

type ClientePacote = {
  id: string
  cliente_id: string
  pacote_id: string
  data_inicio: string | null
  data_fim: string | null
  valor_pago: number | null
  status: string | null
  observacoes: string | null
  clientes?: Cliente | null
  marketing_pacotes?: Pacote | null
}

type ClientePacoteSaldo = {
  id: string
  cliente_pacote_id: string
  servico_id: string
  quantidade_total: number
  quantidade_usada: number
  servicos?: Servico | null
}

export default function MarketingPacotes() {
  const [aba, setAba] = useState<'pacotes' | 'vinculos'>('pacotes')
  const [loading, setLoading] = useState(false)

  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [pacoteServicos, setPacoteServicos] = useState<PacoteServico[]>([])
  const [clientePacotes, setClientePacotes] = useState<ClientePacote[]>([])
  const [saldos, setSaldos] = useState<ClientePacoteSaldo[]>([])

  const [mostrarFormPacote, setMostrarFormPacote] = useState(false)
  const [pacoteEditandoId, setPacoteEditandoId] = useState<string | null>(null)

  const [formPacote, setFormPacote] = useState({
    nome: '',
    descricao: '',
    valor: '',
    validade_dias: '30',
    ativo: true,
  })

  const [itensPacote, setItensPacote] = useState<{ servico_id: string; quantidade: string }[]>([
    { servico_id: '', quantidade: '1' },
  ])

  const [mostrarFormVinculo, setMostrarFormVinculo] = useState(false)
  const [formVinculo, setFormVinculo] = useState({
    cliente_id: '',
    pacote_id: '',
    data_inicio: new Date().toISOString().slice(0, 10),
    valor_pago: '',
    observacoes: '',
  })

  const pacoteSelecionadoParaVinculo = useMemo(
    () => pacotes.find((p) => p.id === formVinculo.pacote_id),
    [pacotes, formVinculo.pacote_id],
  )

  useEffect(() => {
    carregarTudo()
  }, [])

  async function carregarTudo() {
    setLoading(true)
    await Promise.all([
      buscarPacotes(),
      buscarServicos(),
      buscarClientes(),
      buscarClientePacotes(),
    ])
    setLoading(false)
  }

  async function buscarPacotes() {
    const { data, error } = await supabase
      .from('marketing_pacotes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      alert('Erro ao buscar pacotes: ' + error.message)
      return
    }

    setPacotes(data || [])

    const { data: itens, error: erroItens } = await supabase
      .from('marketing_pacote_servicos')
      .select('*, servicos(*)')

    if (erroItens) {
      console.warn('Erro ao buscar serviços dos pacotes:', erroItens.message)
    } else {
      setPacoteServicos(itens || [])
    }
  }

  async function buscarServicos() {
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      alert('Erro ao buscar serviços: ' + error.message)
      return
    }

    setServicos(data || [])
  }

  async function buscarClientes() {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, telefone')
      .order('nome', { ascending: true })

    if (error) {
      alert('Erro ao buscar clientes: ' + error.message)
      return
    }

    setClientes(data || [])
  }

  async function buscarClientePacotes() {
    const { data, error } = await supabase
      .from('cliente_pacotes')
      .select('*, clientes(id, nome, telefone), marketing_pacotes(*)')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Erro ao buscar pacotes de clientes:', error.message)
      setClientePacotes([])
    } else {
      setClientePacotes(data || [])
    }

    const { data: saldosData, error: erroSaldos } = await supabase
      .from('cliente_pacote_saldos')
      .select('*, servicos(*)')

    if (erroSaldos) {
      console.warn('Erro ao buscar saldos:', erroSaldos.message)
      setSaldos([])
    } else {
      setSaldos(saldosData || [])
    }
  }

  function limparFormPacote() {
    setPacoteEditandoId(null)
    setFormPacote({
      nome: '',
      descricao: '',
      valor: '',
      validade_dias: '30',
      ativo: true,
    })
    setItensPacote([{ servico_id: '', quantidade: '1' }])
  }

  function abrirNovoPacote() {
    limparFormPacote()
    setMostrarFormPacote(true)
  }

  function editarPacote(pacote: Pacote) {
    setPacoteEditandoId(pacote.id)
    setFormPacote({
      nome: pacote.nome || '',
      descricao: pacote.descricao || '',
      valor: pacote.valor !== null && pacote.valor !== undefined ? String(pacote.valor) : '',
      validade_dias: pacote.validade_dias ? String(pacote.validade_dias) : '30',
      ativo: pacote.ativo ?? true,
    })

    const itens = pacoteServicos
      .filter((item) => item.pacote_id === pacote.id)
      .map((item) => ({
        servico_id: item.servico_id,
        quantidade: String(item.quantidade || 1),
      }))

    setItensPacote(itens.length ? itens : [{ servico_id: '', quantidade: '1' }])
    setMostrarFormPacote(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function salvarPacote(e: React.FormEvent) {
    e.preventDefault()

    if (!formPacote.nome.trim()) {
      alert('Informe o nome do combo/pacote.')
      return
    }

    const itensValidos = itensPacote.filter((item) => item.servico_id && Number(item.quantidade) > 0)

    if (itensValidos.length === 0) {
      alert('Adicione pelo menos um serviço ao pacote.')
      return
    }

    setLoading(true)

    const payloadPacote = {
      nome: formPacote.nome.trim(),
      descricao: formPacote.descricao.trim() || null,
      valor: formPacote.valor ? Number(formPacote.valor) : null,
      validade_dias: formPacote.validade_dias ? Number(formPacote.validade_dias) : null,
      ativo: formPacote.ativo,
    }

    let pacoteId = pacoteEditandoId
    let errorPacote = null

    if (pacoteEditandoId) {
      const { error } = await supabase
        .from('marketing_pacotes')
        .update(payloadPacote)
        .eq('id', pacoteEditandoId)

      errorPacote = error
    } else {
      const { data, error } = await supabase
        .from('marketing_pacotes')
        .insert([payloadPacote])
        .select('id')
        .single()

      pacoteId = data?.id
      errorPacote = error
    }

    if (errorPacote || !pacoteId) {
      alert('Erro ao salvar pacote: ' + (errorPacote?.message || 'pacote não retornou ID'))
      setLoading(false)
      return
    }

    if (pacoteEditandoId) {
      const { error } = await supabase
        .from('marketing_pacote_servicos')
        .delete()
        .eq('pacote_id', pacoteId)

      if (error) {
        alert('Erro ao atualizar serviços do pacote: ' + error.message)
        setLoading(false)
        return
      }
    }

    const payloadItens = itensValidos.map((item) => ({
      pacote_id: pacoteId,
      servico_id: item.servico_id,
      quantidade: Number(item.quantidade),
    }))

    const { error: errorItens } = await supabase
      .from('marketing_pacote_servicos')
      .insert(payloadItens)

    if (errorItens) {
      alert('Pacote salvo, mas houve erro nos serviços: ' + errorItens.message)
      setLoading(false)
      return
    }

    alert(pacoteEditandoId ? 'Pacote atualizado com sucesso!' : 'Pacote criado com sucesso!')
    limparFormPacote()
    setMostrarFormPacote(false)
    await buscarPacotes()
    setLoading(false)
  }

  async function alternarStatusPacote(pacote: Pacote) {
    const { error } = await supabase
      .from('marketing_pacotes')
      .update({ ativo: !pacote.ativo })
      .eq('id', pacote.id)

    if (error) {
      alert('Erro ao alterar status do pacote: ' + error.message)
      return
    }

    await buscarPacotes()
  }

  function limparFormVinculo() {
    setFormVinculo({
      cliente_id: '',
      pacote_id: '',
      data_inicio: new Date().toISOString().slice(0, 10),
      valor_pago: '',
      observacoes: '',
    })
  }

  function calcularDataFim(dataInicio: string, validadeDias?: number | null) {
    if (!dataInicio || !validadeDias) return null

    const data = new Date(dataInicio + 'T00:00:00')
    data.setDate(data.getDate() + validadeDias)

    return data.toISOString().slice(0, 10)
  }

  async function vincularPacoteAoCliente(e: React.FormEvent) {
    e.preventDefault()

    if (!formVinculo.cliente_id) {
      alert('Selecione um cliente.')
      return
    }

    if (!formVinculo.pacote_id) {
      alert('Selecione um pacote.')
      return
    }

    const pacote = pacotes.find((p) => p.id === formVinculo.pacote_id)
    const itensDoPacote = pacoteServicos.filter((item) => item.pacote_id === formVinculo.pacote_id)

    if (!pacote || itensDoPacote.length === 0) {
      alert('Este pacote não possui serviços configurados.')
      return
    }

    setLoading(true)

    const dataFim = calcularDataFim(formVinculo.data_inicio, pacote.validade_dias)

    const { data: clientePacoteCriado, error } = await supabase
      .from('cliente_pacotes')
      .insert([
        {
          cliente_id: formVinculo.cliente_id,
          pacote_id: formVinculo.pacote_id,
          data_inicio: formVinculo.data_inicio || new Date().toISOString().slice(0, 10),
          data_fim: dataFim,
          valor_pago: formVinculo.valor_pago ? Number(formVinculo.valor_pago) : pacote.valor,
          status: 'ativo',
          observacoes: formVinculo.observacoes.trim() || null,
        },
      ])
      .select('id')
      .single()

    if (error || !clientePacoteCriado?.id) {
      alert('Erro ao vincular pacote ao cliente: ' + (error?.message || 'sem ID retornado'))
      setLoading(false)
      return
    }

    const payloadSaldos = itensDoPacote.map((item) => ({
      cliente_pacote_id: clientePacoteCriado.id,
      servico_id: item.servico_id,
      quantidade_total: item.quantidade || 1,
      quantidade_usada: 0,
    }))

    const { error: erroSaldos } = await supabase
      .from('cliente_pacote_saldos')
      .insert(payloadSaldos)

    if (erroSaldos) {
      alert('Pacote vinculado, mas houve erro ao criar saldo: ' + erroSaldos.message)
      setLoading(false)
      return
    }

    alert('Pacote vinculado ao cliente com sucesso!')
    limparFormVinculo()
    setMostrarFormVinculo(false)
    await buscarClientePacotes()
    setLoading(false)
  }

  async function cancelarClientePacote(clientePacote: ClientePacote) {
    const confirmar = window.confirm('Deseja cancelar este pacote do cliente?')

    if (!confirmar) return

    const { error } = await supabase
      .from('cliente_pacotes')
      .update({ status: 'cancelado' })
      .eq('id', clientePacote.id)

    if (error) {
      alert('Erro ao cancelar pacote: ' + error.message)
      return
    }

    await buscarClientePacotes()
  }

  function adicionarItemPacote() {
    setItensPacote([...itensPacote, { servico_id: '', quantidade: '1' }])
  }

  function removerItemPacote(index: number) {
    const novos = itensPacote.filter((_, i) => i !== index)
    setItensPacote(novos.length ? novos : [{ servico_id: '', quantidade: '1' }])
  }

  function atualizarItemPacote(index: number, campo: 'servico_id' | 'quantidade', valor: string) {
    setItensPacote((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)),
    )
  }

  function itensDoPacote(pacoteId: string) {
    return pacoteServicos.filter((item) => item.pacote_id === pacoteId)
  }

  function saldosDoClientePacote(clientePacoteId: string) {
    return saldos.filter((saldo) => saldo.cliente_pacote_id === clientePacoteId)
  }

  function formatarMoeda(valor?: number | null) {
    if (valor === null || valor === undefined) return 'R$ 0,00'
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1250, margin: '0 auto' }}>
        <div style={headerBox}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>Marketing</h1>
            <p style={{ color: '#64748b', marginTop: 6, marginBottom: 0 }}>
              Crie combos, pacotes e saldos de serviços para aplicar na finalização do atendimento.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setAba('pacotes')}
              style={aba === 'pacotes' ? tabButtonActive : tabButton}
            >
              Combos / Pacotes
            </button>

            <button
              type="button"
              onClick={() => setAba('vinculos')}
              style={aba === 'vinculos' ? tabButtonActive : tabButton}
            >
              Pacotes dos clientes
            </button>
          </div>
        </div>

        {aba === 'pacotes' && (
          <>
            <div style={toolbarBox}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>Combos e pacotes</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b' }}>
                  Exemplo: 4 mãos + 4 pés mensal.
                </p>
              </div>

              {!mostrarFormPacote && (
                <button type="button" onClick={abrirNovoPacote} style={primaryButton}>
                  + Novo pacote
                </button>
              )}
            </div>

            {mostrarFormPacote && (
              <form onSubmit={salvarPacote} style={card}>
                <div style={cardHeader}>
                  <h3 style={{ margin: 0 }}>
                    {pacoteEditandoId ? 'Editar pacote' : 'Novo pacote'}
                  </h3>

                  <button
                    type="button"
                    onClick={() => {
                      limparFormPacote()
                      setMostrarFormPacote(false)
                    }}
                    style={secondaryButton}
                  >
                    Fechar
                  </button>
                </div>

                <div style={grid2}>
                  <Campo label="Nome do pacote *">
                    <input
                      value={formPacote.nome}
                      onChange={(e) => setFormPacote({ ...formPacote, nome: e.target.value })}
                      placeholder="Ex: Combo Pé e Mão Mensal"
                      style={inputStyle}
                    />
                  </Campo>

                  <Campo label="Valor do pacote">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formPacote.valor}
                      onChange={(e) => setFormPacote({ ...formPacote, valor: e.target.value })}
                      placeholder="Ex: 200.00"
                      style={inputStyle}
                    />
                  </Campo>

                  <Campo label="Validade em dias">
                    <input
                      type="number"
                      min="1"
                      value={formPacote.validade_dias}
                      onChange={(e) => setFormPacote({ ...formPacote, validade_dias: e.target.value })}
                      placeholder="30"
                      style={inputStyle}
                    />
                  </Campo>

                  <Campo label="Status">
                    <select
                      value={formPacote.ativo ? 'ativo' : 'inativo'}
                      onChange={(e) => setFormPacote({ ...formPacote, ativo: e.target.value === 'ativo' })}
                      style={inputStyle}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </Campo>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Campo label="Descrição">
                    <textarea
                      value={formPacote.descricao}
                      onChange={(e) => setFormPacote({ ...formPacote, descricao: e.target.value })}
                      placeholder="Descrição comercial do pacote"
                      style={textareaStyle}
                    />
                  </Campo>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={sectionTitleRow}>
                    <h4 style={{ margin: 0 }}>Serviços incluídos</h4>

                    <button type="button" onClick={adicionarItemPacote} style={smallButton}>
                      + Adicionar serviço
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                    {itensPacote.map((item, index) => (
                      <div key={index} style={itemRow}>
                        <select
                          value={item.servico_id}
                          onChange={(e) => atualizarItemPacote(index, 'servico_id', e.target.value)}
                          style={{ ...inputStyle, flex: 1 }}
                        >
                          <option value="">Selecione um serviço</option>
                          {servicos.map((servico) => (
                            <option key={servico.id} value={servico.id}>
                              {servico.nome}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) => atualizarItemPacote(index, 'quantidade', e.target.value)}
                          placeholder="Qtd."
                          style={{ ...inputStyle, width: 120 }}
                        />

                        <button
                          type="button"
                          onClick={() => removerItemPacote(index)}
                          style={smallDangerButton}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button type="submit" disabled={loading} style={primaryButton}>
                    {loading ? 'Salvando...' : pacoteEditandoId ? 'Salvar alterações' : 'Criar pacote'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      limparFormPacote()
                      setMostrarFormPacote(false)
                    }}
                    style={secondaryButton}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Pacotes cadastrados</h3>

              {pacotes.length === 0 ? (
                <p style={{ color: '#64748b' }}>Nenhum pacote cadastrado ainda.</p>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  {pacotes.map((pacote) => {
                    const itens = itensDoPacote(pacote.id)

                    return (
                      <div key={pacote.id} style={pacoteCard}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <h4 style={{ margin: 0, fontSize: 18 }}>{pacote.nome}</h4>
                            <StatusPill ativo={!!pacote.ativo} />
                          </div>

                          <p style={{ color: '#64748b', marginBottom: 8 }}>
                            {pacote.descricao || 'Sem descrição'}
                          </p>

                          <div style={miniInfoRow}>
                            <span><strong>Valor:</strong> {formatarMoeda(pacote.valor)}</span>
                            <span><strong>Validade:</strong> {pacote.validade_dias || '-'} dias</span>
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <strong>Serviços:</strong>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                              {itens.length === 0 ? (
                                <span style={mutedText}>Nenhum serviço vinculado</span>
                              ) : (
                                itens.map((item) => (
                                  <span key={item.id} style={serviceBadge}>
                                    {item.servicos?.nome || 'Serviço'} × {item.quantidade}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
                          <button type="button" onClick={() => editarPacote(pacote)} style={smallButton}>
                            Editar
                          </button>

                          <button type="button" onClick={() => alternarStatusPacote(pacote)} style={smallDangerButton}>
                            {pacote.ativo ? 'Inativar' : 'Ativar'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {aba === 'vinculos' && (
          <>
            <div style={toolbarBox}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>Pacotes dos clientes</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b' }}>
                  Vincule combos aos clientes e acompanhe o saldo de serviços.
                </p>
              </div>

              {!mostrarFormVinculo && (
                <button type="button" onClick={() => setMostrarFormVinculo(true)} style={primaryButton}>
                  + Vender / vincular pacote
                </button>
              )}
            </div>

            {mostrarFormVinculo && (
              <form onSubmit={vincularPacoteAoCliente} style={card}>
                <div style={cardHeader}>
                  <h3 style={{ margin: 0 }}>Vender / vincular pacote ao cliente</h3>

                  <button
                    type="button"
                    onClick={() => {
                      limparFormVinculo()
                      setMostrarFormVinculo(false)
                    }}
                    style={secondaryButton}
                  >
                    Fechar
                  </button>
                </div>

                <div style={grid2}>
                  <Campo label="Cliente *">
                    <select
                      value={formVinculo.cliente_id}
                      onChange={(e) => setFormVinculo({ ...formVinculo, cliente_id: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Selecione um cliente</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome} {cliente.telefone ? `- ${cliente.telefone}` : ''}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Pacote *">
                    <select
                      value={formVinculo.pacote_id}
                      onChange={(e) => {
                        const pacote = pacotes.find((p) => p.id === e.target.value)
                        setFormVinculo({
                          ...formVinculo,
                          pacote_id: e.target.value,
                          valor_pago: pacote?.valor !== null && pacote?.valor !== undefined ? String(pacote.valor) : '',
                        })
                      }}
                      style={inputStyle}
                    >
                      <option value="">Selecione um pacote</option>
                      {pacotes.filter((p) => p.ativo).map((pacote) => (
                        <option key={pacote.id} value={pacote.id}>
                          {pacote.nome} - {formatarMoeda(pacote.valor)}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Data de início">
                    <input
                      type="date"
                      value={formVinculo.data_inicio}
                      onChange={(e) => setFormVinculo({ ...formVinculo, data_inicio: e.target.value })}
                      style={inputStyle}
                    />
                  </Campo>

                  <Campo label="Valor pago">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formVinculo.valor_pago}
                      onChange={(e) => setFormVinculo({ ...formVinculo, valor_pago: e.target.value })}
                      placeholder="Valor pago pelo cliente"
                      style={inputStyle}
                    />
                  </Campo>
                </div>

                {pacoteSelecionadoParaVinculo && (
                  <div style={previewBox}>
                    <strong>Resumo do pacote:</strong>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {itensDoPacote(pacoteSelecionadoParaVinculo.id).map((item) => (
                        <span key={item.id} style={serviceBadge}>
                          {item.servicos?.nome || 'Serviço'} × {item.quantidade}
                        </span>
                      ))}
                    </div>
                    <p style={{ marginBottom: 0, color: '#64748b' }}>
                      Validade até: {calcularDataFim(formVinculo.data_inicio, pacoteSelecionadoParaVinculo.validade_dias) || '-'}
                    </p>
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  <Campo label="Observações">
                    <textarea
                      value={formVinculo.observacoes}
                      onChange={(e) => setFormVinculo({ ...formVinculo, observacoes: e.target.value })}
                      placeholder="Ex: vendido via Pix, promoção especial..."
                      style={textareaStyle}
                    />
                  </Campo>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button type="submit" disabled={loading} style={primaryButton}>
                    {loading ? 'Salvando...' : 'Confirmar pacote'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      limparFormVinculo()
                      setMostrarFormVinculo(false)
                    }}
                    style={secondaryButton}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Pacotes ativos e vendidos</h3>

              {clientePacotes.length === 0 ? (
                <p style={{ color: '#64748b' }}>Nenhum pacote vinculado a cliente ainda.</p>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  {clientePacotes.map((clientePacote) => {
                    const saldosPacote = saldosDoClientePacote(clientePacote.id)
                    const ativo = clientePacote.status === 'ativo'

                    return (
                      <div key={clientePacote.id} style={pacoteCard}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <h4 style={{ margin: 0, fontSize: 18 }}>
                              {clientePacote.clientes?.nome || 'Cliente'} — {clientePacote.marketing_pacotes?.nome || 'Pacote'}
                            </h4>
                            <span
                              style={{
                                ...pillBase,
                                background: ativo ? '#dcfce7' : '#fee2e2',
                                color: ativo ? '#166534' : '#991b1b',
                              }}
                            >
                              {clientePacote.status || 'ativo'}
                            </span>
                          </div>

                          <div style={miniInfoRow}>
                            <span><strong>Início:</strong> {clientePacote.data_inicio || '-'}</span>
                            <span><strong>Fim:</strong> {clientePacote.data_fim || '-'}</span>
                            <span><strong>Valor pago:</strong> {formatarMoeda(clientePacote.valor_pago)}</span>
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <strong>Saldo:</strong>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                              {saldosPacote.length === 0 ? (
                                <span style={mutedText}>Sem saldo cadastrado</span>
                              ) : (
                                saldosPacote.map((saldo) => {
                                  const restante = Number(saldo.quantidade_total || 0) - Number(saldo.quantidade_usada || 0)

                                  return (
                                    <span key={saldo.id} style={serviceBadge}>
                                      {saldo.servicos?.nome || 'Serviço'}: {restante}/{saldo.quantidade_total}
                                    </span>
                                  )
                                })
                              )}
                            </div>
                          </div>

                          {clientePacote.observacoes && (
                            <p style={{ color: '#64748b', marginBottom: 0 }}>
                              {clientePacote.observacoes}
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
                          {ativo && (
                            <button
                              type="button"
                              onClick={() => cancelarClientePacote(clientePacote)}
                              style={smallDangerButton}
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontWeight: 800, marginBottom: 6, color: '#334155', fontSize: 13 }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function StatusPill({ ativo }: { ativo: boolean }) {
  return (
    <span
      style={{
        ...pillBase,
        background: ativo ? '#dcfce7' : '#fee2e2',
        color: ativo ? '#166534' : '#991b1b',
      }}
    >
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}

const headerBox: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 18,
  alignItems: 'center',
  marginBottom: 22,
  flexWrap: 'wrap',
}

const toolbarBox: React.CSSProperties = {
  background: '#fff',
  borderRadius: 18,
  padding: 18,
  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.07)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
  marginBottom: 18,
  flexWrap: 'wrap',
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 18,
  padding: 22,
  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.07)',
  marginBottom: 20,
}

const cardHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  marginBottom: 18,
}

const grid2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 16,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  outline: 'none',
  fontSize: 14,
  boxSizing: 'border-box',
  background: '#fff',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 85,
  resize: 'vertical',
}

const primaryButton: React.CSSProperties = {
  border: 'none',
  background: '#f97316',
  color: '#fff',
  padding: '12px 18px',
  borderRadius: 12,
  fontWeight: 900,
  cursor: 'pointer',
}

const secondaryButton: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#334155',
  padding: '12px 18px',
  borderRadius: 12,
  fontWeight: 800,
  cursor: 'pointer',
}

const tabButton: React.CSSProperties = {
  ...secondaryButton,
  padding: '10px 14px',
}

const tabButtonActive: React.CSSProperties = {
  ...primaryButton,
  padding: '10px 14px',
}

const smallButton: React.CSSProperties = {
  border: 'none',
  background: '#e0f2fe',
  color: '#0369a1',
  padding: '8px 11px',
  borderRadius: 10,
  fontWeight: 800,
  cursor: 'pointer',
}

const smallDangerButton: React.CSSProperties = {
  border: 'none',
  background: '#fee2e2',
  color: '#991b1b',
  padding: '8px 11px',
  borderRadius: 10,
  fontWeight: 800,
  cursor: 'pointer',
}

const pacoteCard: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: 16,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
}

const itemRow: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap',
}

const sectionTitleRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
}

const miniInfoRow: React.CSSProperties = {
  display: 'flex',
  gap: 18,
  flexWrap: 'wrap',
  color: '#334155',
  fontSize: 14,
  marginTop: 8,
}

const serviceBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  background: '#fff7ed',
  color: '#9a3412',
  fontWeight: 800,
  fontSize: 13,
}

const mutedText: React.CSSProperties = {
  color: '#64748b',
  fontSize: 14,
}

const previewBox: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 14,
  marginTop: 16,
}

const pillBase: React.CSSProperties = {
  display: 'inline-flex',
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
}
