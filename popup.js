document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refresh-stats');

  refreshBtn.style.display = 'block';

  refreshBtn.addEventListener('click', () => {
    window.open('https://ads.telegram.org/account', '_blank');
    window.close();
  });
});
