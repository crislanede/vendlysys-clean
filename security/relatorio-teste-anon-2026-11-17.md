# Validação RLS — execução de leitura anônima

Data: 2026-11-17
Projeto: VendlySys / Supabase

## Procedimento executado

Transação de leitura sem gravações:

```sql
begin read only;
set local role anon;
select 'empresas' tabela,count(*) registros_visiveis from public.empresas
union all select 'financeiro',count(*) from public.financeiro
union all select 'pagamentos',count(*) from public.pagamentos;
rollback;
```

## Resultado observado

| Tabela | Registros visíveis para anon |
|---|---:|
| empresas | 1 |
| financeiro | 24 |
| pagamentos | 0 |

**Achado crítico:** leitura de todos os 24 registros financeiros sob papel anônimo. O teste não consulta valores ou dados pessoais, somente contagens.

## Limitações

- A simulação usa `SET LOCAL ROLE anon` em SQL, sem sessão autenticada. Não substitui teste ponta a ponta via API HTTP.
- A ausência de linhas em `pagamentos` não comprova que todas as operações estão seguras.
- O projeto atualmente tem somente um vínculo ativo em `usuarios_empresas`; o teste entre duas empresas ainda depende de identidades de homologação.
- Nenhuma política foi alterada ou aplicada.

## Critérios para liberação

1. Acesso anônimo deve resultar em zero linhas para dados privados e não permitir alterações.
2. Usuários da empresa A não podem ler ou alterar dados da empresa B.
3. Testar SELECT, INSERT, UPDATE e DELETE em cada tabela e em fluxos de aplicativo.
4. Revisar onboarding público antes de retirar as políticas temporárias.
5. Revisar e remover políticas permissivas em `empresas`, `financeiro` e `pagamentos` de forma controlada, após homologação.
6. Evitar `SECURITY DEFINER` exposto em `public`; usar esquema privado e permissões explícitas se necessário.

Referência: https://supabase.com/docs/guides/database/postgres/row-level-security
