export const landingPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telert - Telegram Notifications Made Easy</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 text-gray-800 font-sans">
    <div class="container mx-auto px-4 py-8">
        <header class="text-center mb-12">
            <h1 class="text-4xl font-bold text-indigo-600 mb-2">Telert</h1>
            <p class="text-xl text-gray-600">Telegram Notifications Made Easy</p>
        </header>
        
        <main class="max-w-3xl mx-auto">
            <section class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-2xl font-semibold mb-4">What is Telert?</h2>
                <p class="mb-4">Telert is a simple and powerful tool that allows you to send notifications to your Telegram chats using webhooks. It's perfect for developers, teams, and anyone who wants to stay updated on important events.</p>
                <a href="https://t.me/telerts_bot" class="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors">Start Using Telert Bot</a>
            </section>
            
            <section class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-2xl font-semibold mb-4">Features</h2>
                <ul class="list-disc list-inside space-y-2">
                    <li>Easy setup with Telegram bot</li>
                    <li>Customizable notifications</li>
                    <li>Support for rich messages with emojis</li>
                    <li>File upload capabilities</li>
                    <li>Flexible webhook URLs</li>
                </ul>
            </section>
            
            <section class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-2xl font-semibold mb-4">How to Use</h2>
                <ol class="list-decimal list-inside space-y-2">
                    <li>Add the Telert bot to your Telegram chat</li>
                    <li>Use the /webhook command to get your unique webhook URL</li>
                    <li>Send POST requests to the webhook URL with your notification data</li>
                    <li>Receive notifications in your Telegram chat</li>
                </ol>
            </section>
        </main>
        
        <footer class="text-center mt-12 text-gray-600">
            <p>&copy; 2023 Telert. An indie project with ❤️</p>
        </footer>
    </div>
</body>
</html>
`;