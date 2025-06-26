import React from 'react';
import { Link } from 'react-router-dom';

interface HelpCommand {
  command: string;
  description: string;
}

const HelpDetailed: React.FC = () => {
  const helpCommands: HelpCommand[] = [
    {
      command: "help",
      description: "Shows this help overview"
    },
    {
      command: "clear",
      description: "Clears the current conversation"
    },
    {
      command: "new",
      description: "Starts a new conversation"
    },
    {
      command: "database",
      description: "Shows database management options"
    },
    {
      command: "examples",
      description: "Shows example queries you can ask"
    }
  ];

  return (
    <div className="help-container p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Help Overview</h1>
      
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <p className="mb-2">
          Welcome to the Database Management Assistant. You can use the following commands to interact with the system:
        </p>
      </div>

      <div className="grid gap-4">
        {helpCommands.map((cmd, index) => (
          <div key={index} className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
            <div className="flex items-start">
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-3 py-1 rounded font-mono mr-4">
                /{cmd.command}
              </div>
              <div className="flex-1">
                {cmd.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link to="/new" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
          Return to Chat
        </Link>
      </div>
    </div>
  );
};

export default HelpDetailed;
