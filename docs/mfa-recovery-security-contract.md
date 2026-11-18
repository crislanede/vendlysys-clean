# Recuperação de MFA — contrato de segurança (não ativado)

## Objetivo
Permitir recuperar um autenticador TOTP perdido sem transformar o e-mail em fator único de recuperação. Este documento é um contrato de implementação; **nenhum endpoint de remoção de fatores deve ser publicado antes dos testes de segurança**.

## Estados persistidos
`pending_email → pending_approval → approved → executing → completed`, com saídas `expired`, `rejected` e `failed`. Para usuários comuns, a transição após confirmação do e-mail exige um segundo mecanismo de prova independente (por exemplo, código de recuperação previamente emitido), **não** uma aprovação automática. A aprovação de administradores exige um aprovador cadastrado antes da solicitação, distinto do solicitante.

## Solicitar
- Exigir sessão autenticada recentemente, senha revalidada no servidor e e-mail confirmado; não aceitar `requester_id`, `scope` ou `empresa_id` fornecidos pelo navegador como autorização.
- Derivar papel e empresa de vínculos verificados no banco; negar se houver ambiguidade de identidade.
- Impor limite por usuário/IP, janela de espera, um pedido ativo, expiração curta e resposta genérica contra enumeração.
- Gerar token aleatório criptograficamente seguro; armazenar apenas hash com segredo do servidor, nunca token em logs ou banco em claro.
- Enviar o desafio exclusivamente ao endereço confirmado da conta. Falha no envio não pode resultar em pedido aprovado.

## Confirmar e aprovar
- Comparar hashes em tempo constante, limitar tentativas atomicamente e invalidar token após uso/expiração.
- Administradores: aprovação por usuário diferente, autorizado no mesmo escopo e previamente cadastrado; revalidar vínculo e MFA AAL2 **no momento da aprovação**. O aprovador não pode ser o próprio solicitante.
- Rejeitar aprovadores adicionados após a criação do pedido, evitando substituição oportunista.
- Registrar solicitação, confirmação, aprovação, rejeição e execução na auditoria sem dados secretos.

## Executar
- Remoção de fatores só em Edge Function server-side, com service role nunca exposta ao cliente.
- Consumir autorização de uso único em transação/lock antes de qualquer operação administrativa, com proteção contra corridas e repetição.
- Verificar que o pedido pertence à conta e que ainda é válido; exigir reautenticação e, para administradores, aprovação válida.
- Remover apenas os fatores da conta-alvo após autorização completa; notificar o usuário, invalidar sessões quando aplicável e exigir novo cadastro TOTP.
- Não ativar fluxo de recuperação comum até definir e implementar o segundo fator de recuperação.

## Critérios de aceite
1. E-mail+senha isolados não removem MFA.
2. Solicitante não aprova a própria solicitação; aprovador sem AAL2 não aprova.
3. Token expirado, reutilizado, errado ou com tentativas excedidas é rejeitado.
4. Mudança de função/empresa, remoção de aprovador e concorrência invalidam autorizações inseguras.
5. Auditoria e notificações funcionam; RLS e privilégios continuam restritos.
6. Testes de integração e revisão de segurança concluídos antes de deploy de produção.

Referências:
- https://supabase.com/docs/guides/auth/auth-mfa
- https://supabase.com/docs/reference/javascript/auth-admin-deletefactor
- https://cheatsheetseries.owasp.org/cheatsheets/Multi-Factor_Authentication_Cheat_Sheet.html

## Isolamento e autonomia de empresas (decisão de produto)
- Cada empresa é um tenant independente: o administrador da empresa gerencia solicitações de recuperação dos seus funcionários, sem depender do Super Admin SaaS.
- Para funcionários, o administrador aprovador deve possuir vínculo ativo e permissão explícita de recuperação **na mesma empresa**. Aprovação administrativa é um mecanismo adicional à verificação de titularidade; não substitui reautenticação nem os demais controles.
- Para administradores de empresa, é obrigatória aprovação de **outro** administrador da mesma empresa, previamente designado e com MFA AAL2 válido. Nunca permitir autoaprovação.
- Se houver um único administrador, não liberar bypass automático: estabelecer fluxo excepcional com verificação reforçada de titularidade, auditável, antes de habilitar recuperação.
- Administradores SaaS não são aprovadores rotineiros de contas de empresas. Acesso excepcional de suporte deve ser explícito, limitado, autorizado e auditado.
- Em toda consulta e mutação, derivar e validar `empresa_id` no servidor a partir do vínculo do ator e da conta-alvo. Impedir referências cruzadas (IDOR), inclusive para usuários associados a múltiplas empresas.
- Nunca usar e-mail, nome, perfil enviado pelo cliente ou somente filtragem da interface como prova de autorização.
- Esta seção documenta regras; não habilita endpoints nem modifica dados de produção.
