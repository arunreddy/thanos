import { API_URL } from "@/lib/config";

export default function Home() {
    const loginUrl = `${API_URL}/auth/login`;

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-gray-100 to-gray-200 text-foreground">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Welcome to DB Agentic Ops</h1>
                <p className="text-lg text-gray-700 mb-6">Your intelligent assistant for seamless interactions.</p>
                <a href={loginUrl} className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 cursor-pointer">
                    Sign In
                </a>
            </div>
            <footer className="absolute bottom-4 text-sm text-gray-600">
                DB Agentic Ops ver 0.1
            </footer>
        </div>
    );
}