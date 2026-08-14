import { Target } from 'lucide-react';
import { Card, Button } from '../components/ui/SharedUI';
import { useAuthStore } from '../store/useAuthStore';

export const AuthView = () => {
  const { login } = useAuthStore();

  return (
    <div className="min-h-screen bg-bunny-cream flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full text-center py-10 px-8 shadow-xl border-bunny-border">
        <div className="w-20 h-20 bg-bunny-primary text-white rounded-full flex items-center justify-center shadow-lg mx-auto mb-6 text-4xl">
          🐰
        </div>
        <h1 className="text-3xl font-rounded font-bold text-bunny-text mb-2">Study Bunny</h1>
        <p className="text-bunny-muted font-medium mb-10">Your local-first productivity companion.</p>
        
        <Button onClick={login} className="w-full py-4 text-base bg-white border border-bunny-border hover:bg-bunny-cream text-bunny-text shadow-sm flex items-center justify-center gap-3">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </Button>
        
        <div className="mt-8 pt-6 border-t border-bunny-border/50 text-xs text-bunny-muted text-left flex items-start gap-3">
          <Target className="w-5 h-5 text-bunny-primary flex-shrink-0" />
          <p>Your data is stored <strong>locally and privately</strong> on your device. Authentication simply ensures your data is kept separate from other profiles on this browser.</p>
        </div>
      </Card>
    </div>
  );
};