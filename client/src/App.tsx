import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/navbar";
import Home from "@/pages/home";
import Tournaments from "@/pages/tournaments";
import Athletes from "@/pages/athletes";
import Ranking from "@/pages/ranking";
import CreateTournament from "@/pages/create-tournament";
import TournamentDetail from "@/pages/tournament-detail";
import TournamentPublic from "@/pages/tournament-public";
import ScoringInfo from "@/pages/scoring-info";
import SelfRegistration from "@/pages/self-registration";
import SelfRegistrationAssociate from "@/pages/self-registration-associate";
import AdminApprovals from "@/pages/admin-approvals";
import Associates from "@/pages/associates";
import Financeiro from "@/pages/financeiro";
import NotFound from "@/pages/not-found";
import TournamentConsent from "@/pages/tournament-consent";
import PublicTournamentRegister from "@/pages/public-tournament-register";
import SimpleRegister from "@/pages/simple-register";
import PublicTournamentView from "@/pages/public-tournament-view";
import PublicTournamentSuccess from "@/pages/public-tournament-success";
import TournamentRegistration from "@/pages/tournament-registration";
import ConsentTournament from "@/pages/consent-tournament";
import Consent from "@/pages/consent";
import ConsentsAdmin from "@/pages/consents-admin";
import { AuthProvider } from "@/context/auth-context";
import ProtectedRoute from "@/components/protected-route";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        {/* Rotas públicas SEM navbar */}
        <Route path="/cadastro-atleta" component={SelfRegistration} />
        <Route path="/cadastro-associado" component={SelfRegistrationAssociate} />
        <Route path="/self-registration" component={SelfRegistration} />
        
        {/* Rotas de consentimento */}
        <Route path="/consent/athlete">
          {() => <Consent type="atleta" />}
        </Route>
        <Route path="/consent/associate">
          {() => <Consent type="associado" />}
        </Route>
        
        {/* Rotas de torneios públicos */}
        <Route path="/tournament/:id" component={TournamentPublic} />
        <Route path="/tournament/:id/register">
          {(params) => <PublicTournamentRegister tournamentId={params.id} />}
        </Route>
        <Route path="/simple-register/:id">
          {(params) => <SimpleRegister tournamentId={params.id} />}
        </Route>
        <Route path="/tournament/:id/success">
          {(params) => <PublicTournamentSuccess tournamentId={params.id} />}
        </Route>
        <Route path="/tournament/:id/view">
          {(params) => <PublicTournamentView />}
        </Route>
        
        {/* Nova rota de inscrição integrada */}
        <Route path="/consent/tournament/:tournamentId" component={ConsentTournament} />
        <Route path="/register/tournament/:tournamentId">
          {(params) => <PublicTournamentRegister tournamentId={params.tournamentId} />}
        </Route>
        
        {/* Rotas administrativas COM navbar (PROTEGIDAS) */}
        <Route path="/">
          {() => (
            <ProtectedRoute>
              <Navbar />
              <Home />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/tournaments">
          {() => (
            <ProtectedRoute>
              <Navbar />
              <Tournaments />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/athletes">
          {() => (
            <ProtectedRoute>
              <Navbar />
              <Athletes />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/associates">
          {() => (
            <ProtectedRoute>
              <Navbar />
              <Associates />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/ranking">
          {() => (
            <ProtectedRoute>
              <Navbar />
              <Ranking />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/financeiro">
          {() => (
            <ProtectedRoute>
              <Navbar />
              <Financeiro />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/create-tournament">
          {() => (
            <ProtectedRoute>
              <Navbar />
              <CreateTournament />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/admin/approvals">
          {() => (
            <ProtectedRoute>
              <Navbar />
              <AdminApprovals />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/admin/consents">
          {() => (
            <ProtectedRoute>
              <Navbar />
              <ConsentsAdmin />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/tournaments/:id">
          {(params) => (
            <ProtectedRoute>
              <Navbar />
              <TournamentDetail id={params.id} />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/tournaments/:id/scoring">
          {(params) => (
            <ProtectedRoute>
              <Navbar />
              <ScoringInfo id={params.id} />
            </ProtectedRoute>
          )}
        </Route>
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
