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
  const { userId, subscription } = req.body; // Теперь получаем и userId
  
  if (!subscription || !subscription.endpoint || !userId) {
    return res.status(400).json({ 
      error: 'Не хватает данных: нужны userId и subscription' 
    });
  }
  
  // Удаляем старую подписку этого пользователя
  const index = subscriptions.findIndex(sub => sub.userId === userId);
  if (index !== -1) {
    subscriptions.splice(index, 1);
  }
  
  // Сохраняем новую подписку С userId
  subscriptions.push({ userId, subscription });
  
  console.log(`✅ Подписок: ${subscriptions.length}`);
  res.json({
    success: true,
    count: subscriptions.length,
    message: 'Подписка сохранена'
  });
});

app.get('/check-subscription', (req, res) => {
  try {
    const userId = req.query.id
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Не указан ID пользователя',
      })
    }

    // Убедитесь, что subscriptions существует и это массив
    if (!subscriptions || !Array.isArray(subscriptions)) {
      return res.json({
        success: false,
        message: 'База подписок не инициализирована',
      })
    }

    // Ищем подписку по userId
    const userSubscription = subscriptions.find((sub) => sub.userId === userId)

    if (!userSubscription) {
      return res.json({
        success: false,
        message: 'Подписка не найдена',
      })
    }

    return res.json({
      success: true,
      message: 'Подписка существует',
      data: userSubscription.subscription,
    })
  } catch (error) {
    console.error('Ошибка в /check-subscription:', error)
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error.message,
    })
  }
})
// 4. Отправка уведомления
app.post('/send', async (req, res) => {
  console.log('📨 Отправка уведомления...');
  if (subscriptions.length === 0) {
    return res.json({ 
      error: 'Нет подписок',
      message: 'Сначала подпишитесь!' 
    });
  }

	const {title, body} = req.body
  
  // Отправляем всем
  const results = [];
  
  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(sub.subscription, JSON.stringify({
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