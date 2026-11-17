# Revisão do login e da resolução de empresa — 2026-11-17

**Escopo:** revisão de código na branch `feat/asaas-sandbox-connection-check`. Não foram aplicadas políticas RLS nem alterações no banco de produção.

## Fluxo observado

1. `src/pages/login.tsx` usa `supabase.auth.signInWithPassword` e `auth.getUser`.
2. Para identificar administradores SaaS, consulta `public.usuarios` por e-mail e perfil `super_admin` / `admin_saas`. Verificar que a autorização efetiva das rotas/RPC não dependa apenas desta consulta no navegador.
3. `src/hooks/useEmpresa.ts` consulta `usuarios_empresas` com `user_id = auth.uid()` e `ativo = true`; em seguida busca as empresas relacionadas.
4. Se não encontrar vínculos, busca `empresas.user_id = auth.uid()` e atribui perfil `admin` ao proprietário.
5. `localStorage.vendlysys_empresa_ativa_id` escolhe apenas dentre as empresas carregadas; **não é fonte de autorização** e não pode ser confiado pelo banco.
6. `src/lib/supabase.ts` usa `VITE_SUPABASE_ANON_KEY`, chave pública esperada em cliente web; removidos logs de URL/prefixo da chave por higiene de segurança.

## Implicações para RLS

- A autorização por empresa deve considerar **vínculo ativo OU proprietário em `empresas.user_id`**, conforme o fluxo efetivamente suportado.
- O projeto possui `usuarios_empresas` com RLS sem políticas segundo auditoria anterior. Uma política que consulta essa tabela pode não enxergar vínculos. Verificar GRANTs e acesso antes de alterar qualquer política.
- Não presumir que uma consulta de perfil por e-mail seja autorização administrativa segura. Validar a ligação entre usuário autenticado e perfil privilegiado.
- Agenda pública e Meu Espaço precisam de acesso público controlado, com dados minimizados.
- Não aplicar o SQL `supabase/security/revisao_rls_profissionais_nao_aplicar.sql` sem corrigir esses pré-requisitos.
- O limite de profissionais no frontend não substitui validação transacional no banco.

## Critérios de teste antes de publicar

- Proprietário sem registro em `usuarios_empresas` acessa sua empresa.
- Funcionário com vínculo ativo acessa somente sua empresa.
- Funcionário inativo não acessa a empresa.
- Usuário da empresa A não lê/escreve registros privados da empresa B, inclusive por chamadas diretas à API.
- Usuário anônimo vê apenas dados públicos necessários para agendamento.
- Admin SaaS é validado por autorização confiável, não apenas por estado de UI.
- Confirmar comportamento do MFA e de troca de empresa.

**Bloqueio de implantação:** backup restaurável e ambiente isolado para testar as políticas antes de tocar produção.

Documentação: https://supabase.com/docs/guides/database/postgres/row-level-security
