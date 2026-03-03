export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl font-bold mb-8" data-testid="text-privacy-title">Políticas de Privacidade</h1>

      <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
        <p>
          <strong>1. Informações que Coletamos</strong>
        </p>
        <p>
          Ao utilizar o site Psicometria Online, podemos coletar informações pessoais como nome, endereço de e-mail e dados de navegação. Essas informações são coletadas quando você preenche formulários, se inscreve em nossa newsletter ou interage com nosso conteúdo.
        </p>

        <p>
          <strong>2. Uso das Informações</strong>
        </p>
        <p>
          As informações coletadas são utilizadas para melhorar a experiência do usuário, personalizar o conteúdo apresentado, enviar comunicações relevantes e garantir o funcionamento adequado de nossos serviços.
        </p>

        <p>
          <strong>3. Cookies</strong>
        </p>
        <p>
          Utilizamos cookies e tecnologias semelhantes para coletar informações sobre a navegação dos usuários em nosso site. Os cookies nos permitem reconhecer visitantes recorrentes, analisar o tráfego e melhorar a funcionalidade do site.
        </p>

        <p>
          <strong>4. Compartilhamento de Informações</strong>
        </p>
        <p>
          Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing sem o seu consentimento. Podemos compartilhar informações com prestadores de serviços que nos auxiliam na operação do site, desde que esses prestadores concordem em manter a confidencialidade das informações.
        </p>

        <p>
          <strong>5. Segurança dos Dados</strong>
        </p>
        <p>
          Adotamos medidas de segurança adequadas para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição. No entanto, nenhum método de transmissão pela internet ou método de armazenamento eletrônico é 100% seguro.
        </p>

        <p>
          <strong>6. Direitos do Usuário</strong>
        </p>
        <p>
          Você tem o direito de acessar, corrigir ou excluir suas informações pessoais a qualquer momento. Para exercer esses direitos, entre em contato conosco através do e-mail indicado abaixo.
        </p>

        <p>
          <strong>7. Alterações nesta Política</strong>
        </p>
        <p>
          Reservamo-nos o direito de atualizar esta Política de Privacidade periodicamente. Recomendamos que você consulte esta página regularmente para se manter informado sobre quaisquer alterações.
        </p>

        <p>
          <strong>8. Contato</strong>
        </p>
        <p>
          Para quaisquer dúvidas ou solicitações relacionadas a esta Política de Privacidade, entre em contato conosco em{" "}
          <a href="mailto:brunodamasio@psicometriaonline.com.br" className="text-accent-bright hover:underline">
            brunodamasio@psicometriaonline.com.br
          </a>
        </p>
      </div>
    </div>
  );
}
