import { API_URL } from "@/lib/config";

const Login = () => {
  const loginUrl = `${API_URL}/auth/login`;

  return (
    <main className="flex items-center justify-center min-h-screen bg-background">
      <div className="p-8 max-w-sm w-full bg-card shadow-lg rounded-lg border border-border items-center">
        <header className="text-center mb-6">
          <img
            src="/eddi_logo.png"
            alt="EDDI Assistant"
            className="w-32 mx-auto mb-2"
          />
          <h1 className="text-2xl font-bold text-foreground">EDDI Assistant</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your friendly assistant for all your database needs.
          </p>
        </header>
  

        <div className="flex justify-center">
          <a
            href={loginUrl}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-10 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
            aria-label="Login with Okta"
          >
            Login with Okta
          </a>
        </div>

        <section className="mt-8">
          <div className="p-4 bg-muted rounded-md">
            <h2 className="text-sm font-semibold text-foreground mb-2">Need Help?</h2>
            <p className="text-sm text-muted-foreground">
              Contact EDDI Assistant support team at <br/> <a href="mailto:dl-edsdelivery@citizensbank.com" className="text-primary hover:underline">dl-edsdelivery@citizensbank.com</a> for assistance.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;