/* ============================================================
   Um punhado de coisas que todos os modulos consultam.
   Precisa vir antes dos outros scripts.
   ============================================================ */
window.MK = {
  /* quem pediu menos movimento nao recebe animacao nenhuma */
  semMovimento: window.matchMedia("(prefers-reduced-motion: reduce)").matches
};
