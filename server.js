// server.js
const webPush = require('web-push');
const express = require('express');
const cors = require('cors');

const app = express();

// ВАЖНО: cors() должен быть ПЕРВЫМ!
app.use(cors());
app.use(express.json());

// Ключи для теста (используйте эти!)
const vapidKeys = {
  publicKey: 'BM7hXmhRyXqo593LmFxem6daSS9gmSurqcpknUmAmrWSoXiYlCpg-Qx5Jqyoye6thwv7QOd1ZC0K_jLxvO2snrE',
  privateKey: 'KqaG4BBA9pjoQH4IGrs6QakXm0oxviP_mLeCzanRKhA'
};

// Настройка web-push
webPush.setVapidDetails(
  'mailto:test@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Храним подписки в памяти
let subscriptions = [];

// 1. Проверка сервера
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Push сервер работает!',
    subscriptions: subscriptions.length 
  });
});

// 2. Получить ключ
app.get('/vapid-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// 3. Подписка - ПРОСТОЙ ВАРИАНТ
app.post('/subscribe', (req, res) => {
  console.log('📝 Получена подписка');
  
  const subscription = req.body;
  
  // Проверяем минимальные данные
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Нет endpoint' });
  }
  
  // Добавляем подписку
  subscriptions.push(subscription);
  
  console.log(`✅ Подписок: ${subscriptions.length}`);
  
  res.json({ 
    success: true, 
    count: subscriptions.length,
    message: 'Подписка сохранена' 
  });
});

// 4. Отправка уведомления
app.post('/send', async (req, res) => {
  console.log('📨 Отправка уведомления...');
  
  const { title = 'Тест', body = 'Привет!' } = req.body;
  
  if (subscriptions.length === 0) {
    return res.json({ 
      error: 'Нет подписок',
      message: 'Сначала подпишитесь!' 
    });
  }
  
  // Отправляем всем
  const results = [];
  
  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(sub, JSON.stringify({
        title,
        body,
        icon: '/vite.svg'
      }));
      results.push('✅');
    } catch (error) {
      results.push('❌');
      console.log('Ошибка отправки:', error.message);
    }
  }
  
  console.log(`📊 Отправлено: ${results.filter(r => r === '✅').length}/${subscriptions.length}`);
  
  res.json({ 
    success: true,
    sent: results.filter(r => r === '✅').length,
    total: subscriptions.length 
  });
});

// 5. Статистика
app.get('/stats', (req, res) => {
  res.json({
    subscriptions: subscriptions.length,
    publicKey: vapidKeys.publicKey.substring(0, 30) + '...'
  });
});

// 6. Очистка подписок
app.delete('/clear', (req, res) => {
  subscriptions = [];
  res.json({ success: true, message: 'Очищено' });
});

// Запуск
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`
🚀 Сервер запущен: http://localhost:${PORT}
🔑 Public Key: ${vapidKeys.publicKey.substring(0, 50)}...
📧 Email: mailto:test@example.com

📋 Эндпоинты:
  GET  /            - Проверка
  GET  /vapid-key   - Получить ключ
  POST /subscribe   - Подписаться
  POST /send        - Отправить уведомление
  GET  /stats       - Статистика
  DELETE /clear     - Очистить подписки
  `);
});