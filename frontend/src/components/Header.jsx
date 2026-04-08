import { useContext } from 'react';
import styles from './Header.module.css';

const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <h1 className={styles.title}>MVP App</h1>
        <span className={styles.badge}>Mobile First</span>
      </div>
    </header>
  );
};

export default Header;