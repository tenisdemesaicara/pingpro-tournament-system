export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  static async sendEmail(template: EmailTemplate): Promise<boolean> {
    // Por enquanto, apenas loga o email no console
    // Em produção, usaremos EmailJS para envio real do frontend
    console.log('\n=== EMAIL SERIA ENVIADO ===');
    console.log(`Para: ${template.to}`);
    console.log(`Assunto: ${template.subject}`);
    console.log('Conteúdo:', template.text || template.html.substring(0, 200) + '...');
    console.log('============================\n');
    
    return true; // Simular sucesso
  }

  static createApprovalEmail(athleteName: string, athleteEmail: string): EmailTemplate {
    const subject = 'Cadastro Aprovado - Pong Pro';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
          <h1>🏓 Pong Pro</h1>
          <h2>Cadastro Aprovado!</h2>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>Olá <strong>${athleteName}</strong>,</p>
          
          <p>Temos o prazer de informar que seu cadastro no Pong Pro foi <strong>aprovado</strong>!</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #4CAF50;">✅ Próximos Passos:</h3>
            <ul>
              <li>Seu perfil de atleta foi ativado no sistema</li>
              <li>Você já pode se inscrever em torneios disponíveis</li>
              <li>Acesse o sistema com suas credenciais</li>
              <li>Complete seu perfil com foto e informações adicionais</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://pingpongpro.com" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Acessar Pong Pro
            </a>
          </div>
          
          <p>Bem-vindo à comunidade do tênis de mesa!</p>
          
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            Este é um email automático. Se você tiver dúvidas, entre em contato conosco.<br>
            Pong Pro - Sistema de Gerenciamento de Torneios de Tênis de Mesa
          </p>
        </div>
      </div>
    `;
    
    const text = `
      Pong Pro - Cadastro Aprovado
      
      Olá ${athleteName},
      
      Seu cadastro no Pong Pro foi aprovado!
      
      Próximos passos:
      - Seu perfil de atleta foi ativado
      - Você já pode se inscrever em torneios
      - Acesse o sistema com suas credenciais
      
      Bem-vindo à comunidade do tênis de mesa!
    `;

    return {
      to: athleteEmail,
      subject,
      html,
      text
    };
  }

  static createRejectionEmail(athleteName: string, athleteEmail: string, reason: string): EmailTemplate {
    const subject = 'Cadastro Rejeitado - Pong Pro';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f44336; color: white; padding: 20px; text-align: center;">
          <h1>🏓 Pong Pro</h1>
          <h2>Cadastro Rejeitado</h2>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>Olá <strong>${athleteName}</strong>,</p>
          
          <p>Infelizmente, seu cadastro no Pong Pro foi rejeitado.</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f44336;">
            <h3 style="color: #f44336;">📋 Motivo da Rejeição:</h3>
            <p style="background-color: #ffebee; padding: 10px; border-radius: 3px;">${reason}</p>
          </div>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #2196F3;">🔄 O que fazer agora?</h3>
            <ul>
              <li>Revise as informações fornecidas</li>
              <li>Corrija os problemas apontados</li>
              <li>Realize um novo cadastro com as informações corretas</li>
              <li>Entre em contato conosco se tiver dúvidas</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://pingpongpro.com/cadastro-atleta" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Fazer Novo Cadastro
            </a>
          </div>
          
          <p>Agradecemos seu interesse em participar da nossa comunidade!</p>
          
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            Este é um email automático. Se você tiver dúvidas, entre em contato conosco.<br>
            Pong Pro - Sistema de Gerenciamento de Torneios de Tênis de Mesa
          </p>
        </div>
      </div>
    `;
    
    const text = `
      Pong Pro - Cadastro Rejeitado
      
      Olá ${athleteName},
      
      Infelizmente, seu cadastro foi rejeitado.
      
      Motivo: ${reason}
      
      O que fazer:
      - Revise as informações fornecidas
      - Corrija os problemas apontados  
      - Realize um novo cadastro
      
      Agradecemos seu interesse!
    `;

    return {
      to: athleteEmail,
      subject,
      html,
      text
    };
  }
}