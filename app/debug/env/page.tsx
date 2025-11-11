'use client';

export default function EnvDebugPage() {
    const checkEnv = async () => {
        try {
            const response = await fetch('/api/debug/env');
            const data = await response.json();
            console.log('Environment check:', data);
            alert(JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error checking env:', error);
            alert('Error: ' + error);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Environment Debug</h1>
            <button
                onClick={checkEnv}
                className="bg-blue-500 text-white px-4 py-2 rounded"
            >
                Check Environment Variables
            </button>
        </div>
    );
}
