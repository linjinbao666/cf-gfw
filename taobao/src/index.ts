import useProxy from 'rocket-booster';

addEventListener('fetch', (event) => {
  const proxy = useProxy();
  proxy.use('/', {
    upstream: {
      domain: 'www.taobao.com',
      protocol: 'https',
    },

    rewrite: {
      path: {
        '/method/get': '/get',
      },
    },

    firewall: [
      {
        field: 'country',
        operator: 'in',
        value: [],
      },
    ],
  });

  const response = proxy.apply(event.request);
  event.respondWith(response);
});
