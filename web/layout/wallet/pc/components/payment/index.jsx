import { Input, Radio } from '@discuzq/design';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import styles from './index.module.scss';
import locals from '@common/utils/local-bridge';

const Payment = (props, ref) => {
  // 获取缓存
  let info = locals.get('USER_PAYMENT_INFO');
  if (info) {
    try {
      info = JSON.parse(info);
    } catch (error) {
      console.log(error);
    }
  }

  const [wxValue, setWxValue] = useState(info?.wxValue || '');
  const [telValue, setTelValue] = useState(info?.telValue || '');
  const [name, setName] = useState(info?.name || '');
  const [no, setNo] = useState(info?.no || '');

  const [defaultValue, setdefaultValue] = useState(info?.type || 'wx');

  useImperativeHandle(ref, () => ({
    getData: () => {
      const data = {
        type: defaultValue,
        wxValue,
        telValue,
        name,
        no,
      };
      // 设置缓存
      locals.set('USER_PAYMENT_INFO', JSON.stringify(data));
      return { desc: getInfoStr() };
    },
  }));

  const getInfoStr = () => {
    let str = '';
    switch (defaultValue) {
      case 'wx':
        str = `微信：${wxValue || ''}`;
        break;
      case 'tel':
        str = `手机号：${telValue || ''}`;
        break;
      default:
        str = `银行卡：${name || ''}；\n 银行卡号：${no || ''}`;
        break;
    }
    return str;
  };

  return (
    <div className={styles.pay}>
      <div className={`${styles.payItem} ${styles.title}`}>收款账号</div>

      <Radio.Group defaultValue={defaultValue} onChange={setdefaultValue}>
        <div className={`${styles.payItem} ${styles.noborder}`}>
          <span className={`${styles.label} ${defaultValue === 'wx' && styles.checked}`}>微信号</span>
          <Input
            placeholder="输入微信号"
            value={wxValue}
            className={styles.input}
            onChange={(e) => setWxValue(e.target.value)}
          />
          <Radio name="wx" className={styles.check}></Radio>
        </div>

        <div className={`${styles.payItem} ${styles.tips}`}>优先打款到绑定微信号</div>

        <div className={styles.payItem}>
          <span className={`${styles.label} ${defaultValue === 'tel' && styles.checked}`}>手机号</span>
          <Input
            placeholder="输入手机号"
            mode="number"
            value={telValue}
            className={styles.input}
            onChange={(e) => setTelValue(e.target.value)}
          />
          <Radio name="tel" className={styles.check}></Radio>
        </div>

        <div className={`${styles.payItem} ${styles.noborder}`}>
          <span className={`${styles.label} ${defaultValue === 'card' && styles.checked}`}>银行卡</span>
          <Radio name="card" className={styles.check}></Radio>
        </div>

        <div className={styles.payItem}>
          <Input
            value={name}
            placeholder="输入银行名称，姓名"
            className={styles.input}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.payItem}>
          <Input
            mode="number"
            value={no}
            placeholder="输入银行卡号"
            className={styles.input}
            onChange={(e) => setNo(e.target.value)}
          />
        </div>
      </Radio.Group>
    </div>
  );
};

export default forwardRef(Payment);
