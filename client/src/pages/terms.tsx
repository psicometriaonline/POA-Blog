import { Link } from "wouter";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl font-bold mb-8" data-testid="text-terms-title">Termos de Uso</h1>

      <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
        <p>
          <strong>1. Aceitação dos Termos</strong>
        </p>
        <p>
          Ao acessar e usar Psicometria Online você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concordar com qualquer um destes termos, não deve usar Psicometria Online.
        </p>

        <p>
          <strong>2. Uso do Conteúdo</strong>
        </p>
        <p>
          Todo o conteúdo em Psicometria Online é protegido por direitos autorais e pertence a Psicometria Online ou aos seus colaboradores. O uso do conteúdo, incluindo reprodução, distribuição, modificação ou exibição, sem a permissão expressa por escrito de Psicometria Online, é estritamente proibido.
        </p>

        <p>
          <strong>3. Comentários e Submissões</strong>
        </p>
        <p>
          a. Ao enviar comentários ou outros materiais, você concede a Psicometria Online uma licença perpétua, não exclusiva e isenta de royalties para usar, reproduzir, modificar e distribuir tais materiais.
        </p>
        <p>
          b. Psicometria Online se reserva o direito de monitorar, editar ou remover qualquer conteúdo enviado pelos usuários que considere inadequado, ofensivo ou em violação destes Termos de Uso.
        </p>

        <p>
          <strong>4. Limitação de Responsabilidade</strong>
        </p>
        <p>
          Psicometria Online e seus colaboradores não serão responsáveis por quaisquer danos diretos, indiretos, incidentais ou consequentes decorrentes do uso ou incapacidade de usar Psicometria Online ou qualquer conteúdo nele contido.
        </p>

        <p>
          <strong>5. Links para Sites de Terceiros</strong>
        </p>
        <p>
          Psicometria Online pode conter links para sites de terceiros. Tais sites não estão sob nosso controle, e Psicometria Online não é responsável pelo conteúdo de qualquer site vinculado.
        </p>

        <p>
          <strong>6. Alterações aos Termos de Uso</strong>
        </p>
        <p>
          Psicometria Online pode alterar estes Termos de Uso de tempos em tempos. Consulte esta página regularmente para se manter atualizado.
        </p>

        <p>
          <strong>7. Lei Aplicável</strong>
        </p>
        <p>
          Estes Termos de Uso são regidos e interpretados de acordo com as leis do Brasil, sem considerar seus conflitos de disposições legais.
        </p>

        <p>
          <strong>8. Contate-nos</strong>
        </p>
        <p>
          Para quaisquer dúvidas ou preocupações relacionadas a estes Termos de Uso, entre em contato conosco em{" "}
          <a href="mailto:brunodamasio@psicometriaonline.com.br" className="text-accent-bright hover:underline">
            brunodamasio@psicometriaonline.com.br
          </a>
        </p>
      </div>
    </div>
  );
}
