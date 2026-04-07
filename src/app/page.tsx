export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">HD Translators API</h1>
      <p className="text-lg mb-4">
        Human Design Profile Extraction API endpoint.
      </p>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">API Endpoint</h2>
        <p className="font-mono text-sm mb-2">
          POST /api/extract
        </p>
        <p className="text-sm text-gray-600">
          Extract Human Design profile from birth data.
        </p>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Usage Example</h3>
        <pre className="bg-black text-green-400 p-4 rounded text-sm overflow-x-auto">
{`curl -X POST http://localhost:3000/api/extract \\
  -H "Content-Type: application/json" \\
  -d '{
    "birthDate": "1985-07-31",
    "birthTime": "04:33:00",
    "birthLocation": {
      "latitude": -19.8,
      "longitude": 32.86667,
      "timezone": "Africa/Harare"
    }
  }'`}
        </pre>
      </div>
    </main>
  );
}