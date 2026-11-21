# Auditoria de isolamento multiempresa — profissionais e serviços

Data: 2026-11-17. Projeto: vendlysys-prod. **Somente leitura no banco; nenhuma alteração de produção.**

## Constatações verificadas em pg_policies

- `public.profissionais`: policy `Liberar acesso anon temporario` permite ALL a anon/authenticated com `USING true` e `WITH CHECK true`. Também existem políticas permissivas de INSERT/UPDATE/DELETE e `auth all profissionais` com `true`. A policy `meu espaco pode listar profissionais` expõe SELECT ao público sem filtro de empresa.
- `public.servicos`: policy `Liberar acesso anon temporario` permite ALL a anon/authenticated com `true`; `auth all servicos` também permite ALL a authenticated com `true`. Existem políticas de UPDATE/DELETE permissivas.
- `public.profissional_servicos`: policy `Allow all profissional_servicos` permite ALL a PUBLIC com `true`.
- `public.usuarios_empresas`: nenhuma policy retornada pela consulta. RLS habilitado sem policies segundo auditoria anterior; políticas que consultam esta tabela podem falhar.
- Políticas permissivas são combinadas por OR: adicionar uma política restritiva sem remover as permissivas **não corrige** o problema.

## Riscos

1. Operações em registros de outras empresas via API, caso privilégios de tabela permitam.
2. Leitura pública de colunas pessoais de profissionais, dependendo dos GRANTs.
3. Vínculos profissional-serviço sem isolamento na camada de banco.
4. Quebra de fluxos de agenda pública e Meu Espaço se remover SELECT indiscriminadamente.

## Plano antes de qualquer aplicação

1. Obter backup recuperável e testar restauração fora de produção.
2. Inventariar `GRANT`s, colunas, chaves estrangeiras, autenticação real, chamadas públicas e funções RPC.
3. Desenhar autorização com associação empresa/usuário verificável, inclusive RLS de `usuarios_empresas`.
4. Garantir que SELECT público use apenas colunas seguras, idealmente view/API dedicada com controles apropriados.
5. Para escrita em `profissional_servicos`, validar que **ambos** `profissional_id` e `servico_id` pertencem à mesma empresa autorizada.
6. Remover todas as policies permissivas conflitantes em uma migração transacional testada.
7. Testar anon, authenticated empresa A, authenticated empresa B, admin e fluxos de agenda/Meu Espaço.
8. Publicar primeiro em ambiente isolado, depois implantar com plano de rollback e janela de observação.

## Observação de interface

A página `src/pages/profissionais.tsx` passou a consultar vínculos apenas de profissionais da empresa atual no commit `f25aea3aa700a66baf1cb5267946a3440f25f1d9`. **Não equivale a RLS**, pois um cliente malicioso pode chamar a API diretamente.

Documentação: https://supabase.com/docs/guides/database/postgres/row-level-security
