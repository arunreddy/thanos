import { useState } from 'react';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      // Okta authentication logic would go here
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <main className="flex items-center justify-center min-h-screen bg-background">
      <div className="p-8 max-w-sm w-full bg-card shadow-lg rounded-lg border border-border">
        <header className="text-center mb-6">
          <img 
            src="/citizens-logo.png" 
            alt="EDDI Assistant" 
            className="w-16 h-16 mx-auto mb-4" 
          />
          <h1 className="text-2xl font-bold text-foreground">EDDI Assistant</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your friendly assistant for all your database needs.
          </p>
        </header>
        
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
          aria-label="Login with Okta"
        >
          {isLoading ? 'Logging in...' : 'Login with Okta'}
        </button>

        <section className="mt-8">
          <div className="p-4 bg-muted rounded-md">
            <h2 className="text-sm font-semibold text-foreground mb-2">Need Help?</h2>
            <p className="text-sm text-muted-foreground">
              Visit our <a href="/request-access" className="text-primary hover:underline focus:outline-none">Help Center</a> for detailed documentation.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;