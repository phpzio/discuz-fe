import React from 'react';
import styles from './index.module.scss';
export default class Detail extends React.Component {


  static async getInitialProps(appContext) {
    console.log(33333)
    return {
      
    }
  }

  render() {
    return (
      <div className='index'>
        <h1>detail</h1>
        <p className={styles.text}>123123123</p>
      </div>
    );
  }
}
