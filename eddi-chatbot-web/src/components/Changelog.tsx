
const Changelog = () => {
  const changelogData = [
    {
      version: '0.0.1',
      date: '2023-10-01',
      features: ['Added recommend a database', 'Added create a tessel database'],
    }
  ];

  return (
    <div className="changelog-container p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Changelog</h1>
      
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <p className="mb-2">
          Below is the list of updates and features added to the system:
        </p>
      </div>

      <div className="grid gap-4">
        {changelogData.map((entry, index) => (
          <div key={index} className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold mb-2">
              Version {entry.version} - <span className="text-gray-600 dark:text-gray-400">{entry.date}</span>
            </h3>
            <ul className="list-disc list-inside text-gray-800 dark:text-gray-300">
              {entry.features.map((feature, idx) => (
                <li key={idx}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Changelog;
