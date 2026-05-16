import axios from 'axios';

const test = async () => {
  try {
    const res = await axios.put('http://localhost:5000/api/users/role', {}, {
      headers: { Authorization: 'Bearer test' }
    });
    console.log('Status:', res.status);
  } catch (err) {
    console.log('Error Status:', err.response?.status);
    console.log('Error Data:', err.response?.data);
  }
};

test();
