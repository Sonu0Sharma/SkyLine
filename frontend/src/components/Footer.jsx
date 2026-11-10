// frontend/src/components/Footer.jsx

import React from 'react';

function Footer() {
  // Get the current year dynamically for the copyright
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-zinc-200 text-zinc-600 text-sm text-center py-4">
      © {currentYear} Skyline. All Rights Reserved.
    </footer>
  );
}

export default Footer;