import {
  cancelTask,
  queryAccount,
  queryTask,
  queryTaskByIds,
  submitShow,
  submitTask,
  swapFace,
  swapVideoFace,
} from '@/services/mj/api';
import {
  ClearOutlined,
  CloseCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Avatar,
  Button,
  Card,
  Flex,
  Image as AntdImage,
  Input,
  Layout,
  List,
  message,
  Modal,
  notification,
  Progress,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Upload,
} from 'antd';
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import ChannelList from './components/ChannelList';
import styles from './index.less';

const { Sider, Content } = Layout;

const { TextArea } = Input;
const { Meta } = Card;

const Draw: React.FC = () => {
  const PAGE_SIZE = 10;
  const [api, contextHolder] = notification.useNotification();
  const [tasks, setTasks] = useState<any[]>([]); // 从旧到新的一个任务序列
  const [list, setList] = useState<any[]>([]); // 一个额外的容器解决增量渲染问题
  const [dataLoading, setDataLoading] = useState(false);

  const [action, setAction] = useState('imagine');
  const [botType, setBotType] = useState('MID_JOURNEY');
  const [prompt, setPrompt] = useState('');
  const [dimensions, setDimensions] = useState('SQUARE');
  const [images, setImages] = useState<UploadFile[]>([]);

  const [swapImages1, setSwapImages1] = useState<UploadFile[]>([]);
  const [swapImages2, setSwapImages2] = useState<UploadFile[]>([]);

  const [loadingButton, setLoadingButton] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [waitTaskIds] = useState(new Set<string>());

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [customTaskId, setCustomTaskId] = useState<string>('');
  const [modalImage, setModalImage] = useState<string>('');
  const [modalImageHeight, setModalImageHeight] = useState<number>(0);
  const [modalRemix, setModalRemix] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);

  const [accounts, setAccounts] = useState([]);

  // 当前选中的账号
  const [curAccount, setCurAccount] = useState<string>(() => {
    return localStorage.getItem('selectedAccount') || '';
  });

  // TODO 增加任务过滤器来实现, 查看不同频道下的任务
  // const [filteredTasks, setFilteredTasks] = useState<any[]>([]);

  const [collapsed, setCollapsed] = useState(false);

  const intl = useIntl();

  const cbSaver = useRef<any[]>([]); // 回调任务缓存器

  // 分页和加载更多支持
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0); // 统计总计数量
  const [current, setCurrent] = useState(0); // 当前页码
  const [hasMore, setHasMore] = useState(true);
  // const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const syncRunningTasksFutureRef = useRef<NodeJS.Timeout | null>(null);

  const customState = 'midjourney-proxy-admin';
  const imagePrefix = sessionStorage.getItem('mj-image-prefix') || '';

  const syncRunningTasks = async () => {
    const taskIds = Array.from(waitTaskIds);
    const tmpTaskIds = new Set(taskIds);
    if (taskIds.length === 0) return; // 如果没有运行中的任务, 直接返回
    const array = await queryTaskByIds(taskIds);
    let hasChange = false;
    const targetTasks = [...cbSaver.current];
    for (const item of array) {
      tmpTaskIds.delete(item.id);
      if (item.status === 'FAILURE' || item.status === 'SUCCESS' || item.status === 'CANCEL') {
        waitTaskIds.delete(item.id);
      }
      const task = targetTasks.find((element) => element.id === item.id);
      if (!task) {
        hasChange = true;
        targetTasks.push(item);
      } else if (!isSameTask(task, item)) {
        hasChange = true;
        targetTasks.splice(targetTasks.indexOf(task), 1, item);
      }
    }
    for (const needRemoveId of tmpTaskIds) {
      waitTaskIds.delete(needRemoveId);
    }

    // TODO 需要优化
    if (hasChange) {
      cbSaver.current = targetTasks;
      setTasks(targetTasks);
      // 可选：只在新增任务时滚动到底部
      // if (targetTasks.length > cbSaver.current.length) {
      //   scrollToBottom();
      // }
      scrollToBottom();
    }
  };

  const isSameTask = (old: any, task: any) => {
    return (
      old.status === task.status && old.progress === task.progress && old.imageUrl === task.imageUrl
    );
  };

  // const scrollToBottom = () => {
  //   setTimeout(() => {
  //     const panel = document.getElementById('task-panel');
  //     if (!panel) return;
  //     panel.scrollTo(0, panel.scrollHeight);
  //     console.log('滚动到底部');
  //     message.info('滚动到底部');
  //   }, 2000);
  // };
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const panel = scrollRef.current;
      if (!panel) return;

      // 对于反转的滚动条，滚动到"底部"实际上是滚动到顶部
      panel.scrollTo({
        top: panel.scrollHeight,
        behavior: 'smooth',
      });

      // 打印调试信息
      console.log('Scroll info:', {
        scrollHeight: panel.scrollHeight,
        clientHeight: panel.clientHeight,
        scrollTop: panel.scrollTop,
      });
      // message.info('滚动到底部');
    });
  };

  // 获取任务数据
  const fetchData = async (params: any): Promise<any[]> => {
    setDataLoading(true);
    const accs = await queryAccount();
    setAccounts(accs);

    const res = await queryTask(params);
    const array = res.list.reverse(); // 将数据反转
    for (const item of array) {
      if (item.status !== 'FAILURE' && item.status !== 'SUCCESS' && item.action !== 'CANCEL') {
        waitTaskIds.add(item.id);
      }
    }
    cbSaver.current = array;
    setDataLoading(false);
    return array;
  };

  const handleActionChange = (value: string) => {
    setAction(value);
    setPrompt('');
    setImages([]);
  };
  const handleScroll = () => {
    const scrollContainer = scrollRef.current;

    // 当滚动到顶部时加载更多
    if (scrollContainer && !dataLoading) {
      console.log('scrollContainer.scrollTop', scrollContainer.scrollTop);
      console.log('scrollContainer.scrollHeight', scrollContainer.scrollHeight);
      console.log('scrollContainer.clientHeight', scrollContainer.clientHeight);
      // message.info('目标元素正在滚动');
      // const isAtBottom =
      //   Math.abs(
      //     scrollContainer.scrollHeight + scrollContainer.scrollTop - scrollContainer.clientHeight,
      //   ) <= 1;
      const isAtTop = scrollContainer.scrollTop <= 1;
      console.log('isAtTop', isAtTop);

      if (isAtTop && hasMore && !dataLoading) {
        loadMoreData();
      }
    }
  };
  // 加载更多数据
  const loadMoreData = async () => {
    if (dataLoading || !hasMore) {
      // message.info('没有更多数据');
      return;
    }
    // message.info('触发加载, 加载更多数据');
    setDataLoading(true);

    try {
      const newTasks = await fetchData({
        state: customState,
        current: page,
        pageSize: PAGE_SIZE,
        instanceId: curAccount,
        statusSet: ['NOT_START', 'SUBMITTED', 'IN_PROGRESS', 'FAILURE', 'SUCCESS'],
        sort: 'submitTime,desc',
      });

      if (newTasks.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      // 判断是否还有更多可以优化
      setTasks((prevTasks) => [...newTasks, ...prevTasks]);
      setList((prevList) => [...newTasks, ...prevList]); // 同步更新渲染列表
      setPage((prevPage) => prevPage + 1);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setDataLoading(false);
    }
  };

  // 监听滚动事件
  // const handleScroll = () => {
  //   const scrollElement = scrollRef.current;
  //   if (scrollElement && scrollElement.scrollTop === 0) {
  //     message.warning('触发滚动事件');
  //     loadMoreData(); // TODO 暂时禁用
  //   }
  // };
  // const clearScrollListener = useCallback(() => {
  //   if (scrollRef.current) {
  //     scrollRef.current.removeEventListener('scroll', handleScroll);
  //   }
  // }, []);

  // 切换账号
  const handleAccountChange = useCallback(
    async (value: string) => {
      // clearScrollListener(); //TODO 先清除滚动监听

      if (value === curAccount) return;

      localStorage.setItem('selectedAccount', value);
      setCurAccount(value);
      const newTasks = await fetchData({
        state: customState,
        current: 1,
        pageSize: PAGE_SIZE,
        instanceId: value,
        statusSet: ['NOT_START', 'SUBMITTED', 'IN_PROGRESS', 'FAILURE', 'SUCCESS'],
        sort: 'submitTime,desc',
      });
      setTasks(newTasks);
      setList(newTasks); // 同步更新渲染列表
      scrollToBottom(); // 每次切换账号并加载数据后滚动到底部
      if (newTasks.length === PAGE_SIZE) {
        setPage(2); // 每次切换账号后, 重置分页
        setHasMore(true);
      } else {
        setHasMore(false);
      }
      // setTotal(newTasks.length);
      // setHasMore(true); // 每次切换账号后, 重置更多状态
      // TODO 可能需要重置更多状态
    },
    [curAccount],
  );

  const handleBotTypeChange = (value: string) => {
    setBotType(value);
    setPrompt('');
    setImages([]);
  };

  const handleDimensionsChange = (value: string) => {
    setDimensions(value);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleCustomPromptChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setCustomPrompt(e.target.value);
  };

  const readFileAsBase64 = async (file: any) => {
    return await new Promise((resolve) => {
      const fileReader = new FileReader();
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.readAsDataURL(file);
    });
  };

  // 提交任务
  const submit = async () => {
    if (botType === 'INSIGHT_FACE' || botType === 'FACE_SWAP') {
      if (swapImages1.length < 1) {
        message.error(intl.formatMessage({ id: 'pages.draw.swapTip' }));
        return;
      }
      if (swapImages2.length < 1) {
        message.error(intl.formatMessage({ id: 'pages.draw.swapTip' }));
        return;
      }

      setSubmitLoading(true);
      const obj = {
        sourceUrl: '',
        targetUrl: '',
        sourceBase64: '' as any,
        targetBase64: '' as any,
        state: customState,
      };
      if (swapImages1[0].originFileObj) {
        obj.sourceBase64 = await readFileAsBase64(swapImages1[0].originFileObj);
      } else {
        obj.sourceUrl = swapImages1[0].name;
      }

      if (swapImages2[0].originFileObj) {
        obj.targetBase64 = await readFileAsBase64(swapImages2[0].originFileObj);
      } else {
        obj.targetUrl = swapImages2[0].name;
      }

      swapFace(obj).then((res) => {
        setSubmitLoading(false);
        if (res.code === 22 || res.code === 1) {
          if (res.code === 22) {
            api.warning({
              message: 'warn',
              description: res.description,
            });
          } else {
            message.success(intl.formatMessage({ id: 'pages.draw.submitSuccess' }));
          }

          waitTaskIds.add(res.result);
          setSwapImages1([]);
          setSwapImages2([]);
        } else {
          api.error({
            message: 'error',
            description: res.description,
          });
        }
      });
    } else if (botType === 'VIDEO_FACE_SWAP') {
      if (swapImages1.length < 1) {
        message.error(intl.formatMessage({ id: 'pages.draw.swapTip' }));
        return;
      }
      if (swapImages2.length < 1) {
        message.error(intl.formatMessage({ id: 'pages.draw.swapTip' }));
        return;
      }

      setSubmitLoading(true);
      const obj = {
        sourceUrl: '',
        targetUrl: '',
        sourceBase64: '' as any,
        targetBase64: '' as any,
        state: customState,
      };
      if (swapImages1[0].originFileObj) {
        obj.sourceBase64 = await readFileAsBase64(swapImages1[0].originFileObj);
      } else {
        obj.sourceUrl = swapImages1[0].name;
      }

      const formData = new FormData();

      if (swapImages2[0].originFileObj) {
        formData.append('TargetFile', swapImages2[0].originFileObj);
      } else {
        obj.targetUrl = swapImages2[0].name;
      }

      formData.append('SourceBase64', obj.sourceBase64 || '');
      formData.append('SourceUrl', obj.sourceUrl || '');
      formData.append('TargetUrl', obj.targetUrl || '');
      formData.append('Satate', obj.state);

      swapVideoFace(formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }).then((res) => {
        setSubmitLoading(false);
        if (res.code === 22 || res.code === 1) {
          if (res.code === 22) {
            api.warning({
              message: 'warn',
              description: res.description,
            });
          } else {
            message.success(intl.formatMessage({ id: 'pages.draw.submitSuccess' }));
          }

          waitTaskIds.add(res.result);
          setSwapImages1([]);
          setSwapImages2([]);
        } else {
          api.error({
            message: 'error',
            description: res.description,
          });
        }
      });
    } else if (action === 'show') {
      if (!prompt) {
        message.error(intl.formatMessage({ id: 'pages.draw.taskIdNotBlank' }));
        return;
      }
      waitTaskIds.add(prompt);
      setPrompt('');
    } else if (action === 'showjobid') {
      if (!prompt) {
        message.error(intl.formatMessage({ id: 'pages.draw.promptNotBlank' }));
        return;
      }
      setSubmitLoading(true);
      submitShow('show', {
        botType,
        jobId: prompt,
        state: customState,
        accountFilter: {
          instanceId: curAccount,
        },
      }).then((res) => {
        setSubmitLoading(false);
        const success = submitResultCheck(res);
        if (success) {
          waitTaskIds.add(res.result);
          setPrompt('');
          setImages([]);
        }
      });
    } else if (action === 'imagine') {
      if (!prompt) {
        message.error(intl.formatMessage({ id: 'pages.draw.promptNotBlank' }));
        return;
      }
      setSubmitLoading(true);
      const base64Array = [];
      for (const item of images) {
        const base64 = await readFileAsBase64(item.originFileObj);
        base64Array.push(base64);
      }
      submitTask(action, {
        botType,
        prompt,
        base64Array,
        state: customState,
        accountFilter: {
          instanceId: curAccount,
        },
      }).then((res) => {
        setSubmitLoading(false);
        const success = submitResultCheck(res);
        if (success) {
          waitTaskIds.add(res.result);
          setPrompt('');
          setImages([]);
        }
      });
    } else if (action === 'blend') {
      if (images.length < 2) {
        message.error(intl.formatMessage({ id: 'pages.draw.blendTip' }));
        return;
      }
      setSubmitLoading(true);
      const base64Array = [];
      for (const item of images) {
        const base64 = await readFileAsBase64(item.originFileObj);
        base64Array.push(base64);
      }
      submitTask(action, {
        botType,
        base64Array,
        dimensions,
        state: customState,
        accountFilter: {
          instanceId: curAccount,
        },
      }).then((res) => {
        setSubmitLoading(false);
        const success = submitResultCheck(res);
        if (success) {
          waitTaskIds.add(res.result);
          setImages([]);
        }
      });
    } else if (action === 'describe') {
      if (images.length < 1) {
        message.error(intl.formatMessage({ id: 'pages.draw.imageEmptyTip' }));
        return;
      }
      setSubmitLoading(true);
      const base64 = await readFileAsBase64(images[0].originFileObj);
      submitTask(action, {
        botType,
        base64,
        state: customState,
        accountFilter: {
          instanceId: curAccount,
        },
      }).then((res) => {
        setSubmitLoading(false);
        const success = submitResultCheck(res);
        if (success) {
          waitTaskIds.add(res.result);
          setImages([]);
        }
      });
    } else if (action === 'shorten') {
      if (!prompt) {
        message.error(intl.formatMessage({ id: 'pages.draw.promptNotBlank' }));
        return;
      }
      setSubmitLoading(true);
      submitTask(action, {
        botType,
        prompt,
        state: customState,
        accountFilter: {
          instanceId: curAccount,
        },
      }).then((res) => {
        setSubmitLoading(false);
        const success = submitResultCheck(res);
        if (success) {
          waitTaskIds.add(res.result);
          setPrompt('');
        }
      });
    } else {
      message.error(intl.formatMessage({ id: 'pages.draw.unsupportedAction' }));
    }
  };

  const submitResultCheck = (res: any) => {
    if (res.code === 22 || res.code === 1) {
      if (res.code === 22) {
        api.warning({
          message: 'warn',
          description: res.description,
        });
      } else {
        message.success(intl.formatMessage({ id: 'pages.draw.submitSuccess' }));
      }
      return true;
    } else {
      api.error({
        message: 'error',
        description: res.description,
      });
      return false;
    }
  };

  const actionTask = (task: any, button: any) => {
    const customId = button.customId;
    const taskId = task.id;
    const label = `${button.emoji} ${button.label}`;
    setLoadingButton(`${taskId}:${customId}`);
    submitTask('action', {
      taskId,
      customId,
      state: customState,
      chooseSameChannel: true,
    }).then((res) => {
      setLoadingButton('');
      if (res.code === 22) {
        api.warning({
          message: 'warn',
          description: res.description,
        });
        button.style = 3;
        waitTaskIds.add(res.result);
      } else if (res.code === 21) {
        button.style = 3;
        setModalTitle(`${res.result} ${label}`);
        setCustomTaskId(res.result);
        setCustomPrompt(res.properties['finalPrompt']);
        setModalRemix(res.properties['remix'] || false);
        if (customId.startsWith('MJ::Inpaint:')) {
          const imgUrl = `${imagePrefix}${task.imageUrl}`;
          const img = new Image();
          img.src = imgUrl;
          img.onload = function () {
            setModalImageHeight(Math.floor((550 / img.width) * img.height));
            setModalImage(imgUrl);
            setModalVisible(true);
            setTimeout(() => {
              initCanvas();
            }, 300);
          };
        } else {
          setModalImage('');
          setModalVisible(true);
        }
        setModalVisible(true);
      } else if (res.code === 1) {
        button.style = 3;

        if (res.result) {
          // 如果是多个任务，以 ',' 分割
          const taskIds = res.result.split(',');
          taskIds.forEach((taskId: string) => {
            waitTaskIds.add(taskId);
          });

          // waitTaskIds.add(res.result);
        }
        message.success(intl.formatMessage({ id: 'pages.draw.actionSuccess' }));
      } else {
        api.error({
          message: 'error',
          description: res.description,
        });
      }
    });
  };

  let draw = false;
  let startX = 0;
  let startY = 0;

  const initCanvas = () => {
    const canvas: any = document.getElementById('canvas');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const rect = canvas.getBoundingClientRect();
    const rectLeft = Math.floor(rect.left);
    const rectTop = Math.floor(rect.top);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'blue';
    canvas.onmousedown = (e: any) => {
      startX = e.clientX;
      startY = e.clientY;
      draw = true;
    };
    canvas.onmousemove = (e: any) => {
      if (draw === true) {
        ctx.fillRect(startX - rectLeft, startY - rectTop, e.clientX - startX, e.clientY - startY);
      }
    };
    canvas.onmouseup = () => {
      draw = false;
    };
  };

  const cancelModal = () => {
    cancelTask(customTaskId);
    setModalVisible(false);
  };

  const submitModal = async () => {
    let params;
    setLoadingModal(true);
    if (modalImage) {
      const canvas: any = document.getElementById('canvas');
      const newImg = new Image();
      newImg.src = canvas.toDataURL('image/png');
      const base64 = await getMaskBase64(newImg);
      params = { maskBase64: base64, taskId: customTaskId, prompt: customPrompt };
    } else {
      params = { taskId: customTaskId, prompt: customPrompt };
    }
    submitTask('modal', params).then((res) => {
      setLoadingModal(false);
      if (res.code === 22) {
        api.warning({
          message: 'warn',
          description: res.description,
        });
        waitTaskIds.add(res.result);
        setModalVisible(false);
      } else if (res.code === 1) {
        waitTaskIds.add(res.result);
        setModalVisible(false);
        message.success(intl.formatMessage({ id: 'pages.draw.subSuccess' }));
      } else {
        api.error({
          message: 'error',
          description: res.description,
        });
      }
    });
  };

  const getMaskBase64 = async (img: any) => {
    return await new Promise((resolve) => {
      img.onload = function () {
        const { width, height } = img;
        const canvas: any = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
            data[i] = parseInt('0xff');
            data[i + 1] = parseInt('0xff');
            data[i + 2] = parseInt('0xff');
          } else {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        const base64: string = canvas.toDataURL('png');
        resolve(base64);
      };
    });
  };

  const taskCardTitle = (task: any) => {
    let botName = `Midjourney - ${task['displays']['discordInstanceId']}`;
    if (task.botType === 'NIJI_JOURNEY') {
      botName = `niji・journey - ${task['displays']['discordInstanceId']}`;
    } else if (task.botType === 'INSIGHT_FACE' || task.botType === 'FACE_SWAP') {
      botName = `InsightFaceSwap - ${task['displays']['discordInstanceId']}`;
    }
    if (
      task.status !== 'SUCCESS' &&
      task.status !== 'FAILURE' &&
      task.status !== 'CANCEL' &&
      task.action !== 'SWAP_FACE'
    ) {
      return (
        <>
          <span>{botName}</span>
          <span className={styles.cardTitleTime}>{task.displays['submitTime']}</span>
          <Button
            style={{ marginLeft: '10px' }}
            type="link"
            shape="circle"
            icon={<CloseCircleOutlined />}
            onClick={() => cancelTask(task.id)}
          ></Button>
        </>
      );
    }
    return (
      <>
        <span>{botName}</span>
        <span className={styles.cardTitleTime}>{task.displays['submitTime']}</span>
      </>
    );
  };

  const taskCardSubTitle = (task: any) => {
    let title = task.description;
    const messageContent = task.properties['messageContent'];
    if (messageContent) {
      title = messageContent.replace(/<@[^>]+>/g, '');
    }
    return <Markdown>{title}</Markdown>;
  };

  // const taskCardList = () => {
  //   return filteredTasks.map((task: any) => {
  //     let avatar = './midjourney.webp';
  //     if (task.botType === 'NIJI_JOURNEY') {
  //       avatar = './niji.webp';
  //     } else if (
  //       task.botType === 'INSIGHT_FACE' ||
  //       task.botType === 'FACE_SWAP' ||
  //       task.botType === 'VIDEO_FACE_SWAP'
  //     ) {
  //       avatar = './insightface.webp';
  //     }
  //     return (
  //       <Card
  //         bordered={false}
  //         key={task.id}
  //         styles={{
  //           body: {
  //             backgroundColor: '#eaeaea',
  //             marginBottom: '10px',
  //           },
  //         }}
  //       >
  //         <Meta
  //           avatar={<Avatar src={avatar} />}
  //           title={taskCardTitle(task)}
  //           description={taskCardSubTitle(task)}
  //         />
  //         <Flex vertical style={{ paddingLeft: '48px' }}>
  //           {getTaskCard(task)}
  //           <Space wrap style={{ marginTop: '7px' }}>
  //             {actionButtons(task)}
  //           </Space>
  //         </Flex>
  //       </Card>
  //     );
  //   });
  // };

  const getTaskAvatar = (task: any) => {
    let avatar = './midjourney.webp';
    if (task.botType === 'NIJI_JOURNEY') {
      avatar = './niji.webp';
    } else if (
      task.botType === 'INSIGHT_FACE' ||
      task.botType === 'FACE_SWAP' ||
      task.botType === 'VIDEO_FACE_SWAP'
    ) {
      avatar = './insightface.webp';
    }
    return avatar;
  };

  // 任务列表
  const taskCardList = () => {
    return (
      <Card
        ref={scrollRef} // 增加滚动触发器
        id="task-panel"
        onScroll={handleScroll}
        style={{
          overflow: 'auto',
          display: 'flex',
          flex: '1 1 0%',
          flexDirection: 'column',
        }}
        // loading={dataLoading}
      >
        <List
          dataSource={tasks}
          renderItem={(task: any) => (
            <List.Item key={task.id}>
              <Card
                bordered={false}
                style={{ width: '100%' }}
                styles={{
                  body: {
                    backgroundColor: '#eaeaea',
                    marginBottom: '10px',
                  },
                }}
              >
                <Meta
                  avatar={<Avatar src={getTaskAvatar(task)} />} // TODO 可优化
                  title={taskCardTitle(task)}
                  description={taskCardSubTitle(task)}
                />
                <Flex vertical style={{ paddingLeft: '48px' }}>
                  {getTaskCard(task)}
                  <Space wrap style={{ marginTop: '7px' }}>
                    {actionButtons(task)}
                  </Space>
                </Flex>
              </Card>
            </List.Item>
          )}
        />
      </Card>
    );
  };

  const getTaskMarkdownInfo = (task: any) => {
    if (!task.properties['finalPrompt']) {
      return <></>;
    }
    const finalPrompt = task.properties['finalPrompt'];
    return <Markdown>{finalPrompt.replace(/(?<!\n)\n/g, '\n\n')}</Markdown>;
  };

  const getTaskStatus = (task: any) => {
    if (task.status === 'FAILURE') {
      return <span className={styles.taskErrorTip}>{task.failReason}</span>;
    } else if (task.status === 'SUCCESS') {
      return <></>;
    } else if (task.status === 'IN_PROGRESS') {
      return <>{getProgress(task)}</>;
    } else {
      let color = 'purple';
      if (task.status === 'SUBMITTED') {
        color = 'lime';
      } else if (task.status === 'CANCEL') {
        color = 'magenta';
      } else if (task.status === 'MODAL') {
        color = 'warning';
      }
      return (
        <span>
          <Tag color={color}>{task.displays['status']}</Tag>
        </span>
      );
    }
  };

  const getTaskImage = (imageUrl: string, width: number) => {
    if (!imageUrl) return <></>;
    return (
      <AntdImage
        width={width}
        src={`${imagePrefix}${imageUrl}`}
        placeholder={<Spin tip="Loading" size="large"></Spin>}
      />
    );
  };

  const getTaskVideo = (imageUrl: string, width: number) => {
    if (!imageUrl) return <></>;
    return (
      <video
        width={width}
        controls
        src={imagePrefix + imageUrl}
        placeholder={<Spin tip="Loading" size="large"></Spin>}
      ></video>
    );
  };

  const getProgress = (task: any) => {
    const text = task.progress;
    let percent = 0;
    if (text && text.indexOf('%') > 0) {
      percent = parseInt(text.substring(0, text.indexOf('%')));
    }
    return (
      <span style={{ width: 250 }}>
        <Progress percent={percent} status="normal" />
      </span>
    );
  };

  const actionButtons = (task: any) => {
    return task.buttons.map((button: any) => {
      return (
        <Button
          ghost
          key={`${task.id}:${button.customId}`}
          style={{ backgroundColor: button.style === 3 ? '#258146' : 'rgb(131 133 142)' }}
          onClick={() => {
            actionTask(task, button);
          }}
          loading={loadingButton === `${task.id}:${button.customId}`}
        >
          {button.emoji} {button.label}
        </Button>
      );
    });
  };

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Upload</div>
    </div>
  );

  const getTaskCard = (task: any) => {
    if (task.action === 'DESCRIBE') {
      return (
        <>
          {getTaskStatus(task)} {getTaskMarkdownInfo(task)} {getTaskImage(task.imageUrl, 120)}
        </>
      );
    } else if (task.action === 'SHORTEN') {
      return (
        <>
          {getTaskStatus(task)} {getTaskMarkdownInfo(task)}
        </>
      );
    } else {
      return (
        <>
          {getTaskStatus(task)}

          {/* 图片 */}
          {task.action === 'SWAP_VIDEO_FACE' ? (
            <>
              {/* <Flex style={{ maxHeight: 60 }}>
                <div>{getTaskImage(task.replicateSource, 125)}</div>
                <div>{getTaskVideo(task.replicateTarget, 125)}</div>
              </Flex> */}
              {getTaskVideo(task.imageUrl, 250)}
            </>
          ) : (
            getTaskImage(task.imageUrl, 250)
          )}
        </>
      );
    }
  };

  const actionArea = () => {
    let options;
    let isFace = false;
    if (botType === 'INSIGHT_FACE' || botType === 'FACE_SWAP' || botType === 'VIDEO_FACE_SWAP') {
      isFace = true;
      options = [{ value: 'swap', label: '/swap' }];
    } else {
      options = [
        { value: 'imagine', label: '/imagine' },
        { value: 'blend', label: '/blend' },
        { value: 'describe', label: '/describe' },
        { value: 'shorten', label: '/shorten' },
        { value: 'showjobid', label: '/show job_id' },
        { value: 'show', label: '/show task_id' },
      ];
    }
    let bot_options = [
      {
        value: 'MID_JOURNEY',
        label: 'Midjourney',
      },
      {
        value: 'NIJI_JOURNEY',
        label: 'niji・journey',
      },
      // {
      //   value: 'INSIGHT_FACE',
      //   label: 'InsightFace',
      // },
      // {
      //   value: 'FACE_SWAP',
      //   label: 'FaceSwap',
      // },
      // {
      //   value: 'VIDEO_FACE_SWAP',
      //   label: 'Video・FaceSwap',
      // },
    ];
    if (botType === 'INSIGHT_FACE' || botType === 'FACE_SWAP') {
      return (
        <Flex vertical gap={8}>
          <Upload {...swap1Props} listType="picture-card">
            {swapImages1.length >= 1 ? null : uploadButton}
          </Upload>
          <Input
            onChange={(e) => {
              // 赋值到 swapImages1[0]
              if (e.target.value) {
                setSwapImages1([{ uid: '1', name: e.target.value, url: e.target.value }]);
              }
            }}
            placeholder={intl.formatMessage({ id: 'pages.draw.swap1Desc' })}
          />
          <Upload {...swap2Props} listType="picture-card">
            {swapImages2.length >= 1 ? null : uploadButton}
          </Upload>
          <Input
            onChange={(e) => {
              // 赋值到 swapImages1[0]
              if (e.target.value) {
                setSwapImages2([{ uid: '2', name: e.target.value, url: e.target.value }]);
              }
            }}
            placeholder={intl.formatMessage({ id: 'pages.draw.swap2Desc' })}
          />
          <Button
            style={{ marginTop: '10px' }}
            type="primary"
            onClick={submit}
            loading={submitLoading}
          >
            {intl.formatMessage({ id: 'pages.draw.swapDesc' })}
          </Button>
        </Flex>
      );
    }
    if (botType === 'VIDEO_FACE_SWAP') {
      return (
        <Flex vertical gap={8}>
          <Upload {...swap1Props} listType="picture-card">
            {swapImages1.length >= 1 ? null : uploadButton}
          </Upload>
          <Input
            onChange={(e) => {
              // 赋值到 swapImages1[0]
              if (e.target.value) {
                setSwapImages1([{ uid: '1', name: e.target.value, url: e.target.value }]);
              }
            }}
            placeholder={intl.formatMessage({ id: 'pages.draw.swap1Desc' })}
          />
          <Upload {...swap2Props} listType="picture-card">
            {swapImages2.length >= 1 ? null : uploadButton}
          </Upload>
          <Input
            onChange={(e) => {
              // 赋值到 swapImages1[0]
              if (e.target.value) {
                setSwapImages2([{ uid: '2', name: e.target.value, url: e.target.value }]);
              }
            }}
            placeholder={intl.formatMessage({ id: 'pages.draw.swap2VidelDesc' })}
          />
          <Button
            style={{ marginTop: '10px' }}
            type="primary"
            onClick={submit}
            loading={submitLoading}
          >
            {intl.formatMessage({ id: 'pages.draw.swapVideoDesc' })}
          </Button>
        </Flex>
      );
    } else if (action === 'show') {
      return (
        <Space.Compact style={{ width: '100%' }}>
          <Select
            value={botType}
            onChange={handleBotTypeChange}
            defaultValue="MID_JOURNEY"
            style={{ width: 120 }} // 调整宽度
            options={bot_options}
          />

          <Select
            value={isFace ? 'swap' : action}
            style={{ width: 150 }}
            onChange={handleActionChange}
            options={options}
          />
          <Input
            placeholder={intl.formatMessage({ id: 'pages.draw.inputIdShow' })}
            value={prompt}
            onChange={handlePromptChange}
            onPressEnter={submit}
          />
          <Button type="primary" onClick={submit} loading={submitLoading}>
            {intl.formatMessage({ id: 'pages.draw.submitTask' })}
          </Button>
        </Space.Compact>
      );
    } else if (action === 'showjobid') {
      return (
        <Space.Compact style={{ width: '100%' }}>
          <Select
            value={botType}
            onChange={handleBotTypeChange}
            defaultValue="MID_JOURNEY"
            style={{ width: 120 }} // 调整宽度
            options={bot_options}
          />

          <Select
            value={isFace ? 'swap' : action}
            style={{ width: 150 }}
            onChange={handleActionChange}
            options={options}
          />
          <Input
            placeholder={intl.formatMessage({ id: 'pages.draw.inputJobIdShow' })}
            value={prompt}
            onChange={handlePromptChange}
            onPressEnter={submit}
          />
          <Button type="primary" onClick={submit} loading={submitLoading}>
            {intl.formatMessage({ id: 'pages.draw.submitTask' })}
          </Button>
        </Space.Compact>
      );
    } else if (action === 'imagine') {
      return (
        <Flex gap="small" align="center">
          <Select
            value={botType}
            onChange={handleBotTypeChange}
            defaultValue="MID_JOURNEY"
            style={{ width: 120 }} // 调整宽度
            options={bot_options}
          />

          <Select
            value={isFace ? 'swap' : action}
            style={{ width: 150 }}
            onChange={handleActionChange}
            options={options}
          />
          <Upload {...props}>
            {images.length >= 1 ? null : <Button icon={<UploadOutlined />}>上传</Button>}
          </Upload>
          {/* <Flex style={{ width: '100%', marginTop: '10px' }} gap={6}> */}
          <TextArea
            placeholder="Prompt"
            value={prompt}
            onChange={handlePromptChange}
            // onPressEnter={submit}
            autoSize={{ minRows: 1, maxRows: 12 }}
            onKeyDown={(e) => {
              // 如果是 Shift + Enter，允许换行
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // 阻止默认换行
                submit(); // 提交
              }
            }}
          />
          <Button type="primary" onClick={submit} loading={submitLoading}>
            {intl.formatMessage({ id: 'pages.draw.submitTask' })}
          </Button>
          {/* </Flex> */}
        </Flex>
      );
    } else if (action === 'blend') {
      return (
        <Flex gap="small" align="center">
          <Select
            value={botType}
            onChange={handleBotTypeChange}
            defaultValue="MID_JOURNEY"
            style={{ width: 120 }} // 调整宽度
            options={bot_options}
          />
          <Select
            value={isFace ? 'swap' : action}
            style={{ width: 150 }}
            onChange={handleActionChange}
            options={options}
          />
          {/* <Upload {...props} listType="picture-card">
            {images.length >= 5 ? null : uploadButton}
          </Upload> */}
          <Upload {...props} listType="picture-card">
            {images.length >= 5 ? null : <Button icon={<UploadOutlined />}>上传</Button>}
          </Upload>
          {/* <Space style={{ width: '100%', marginTop: '10px' }}> */}
          <Radio.Group
            value={dimensions}
            onChange={handleDimensionsChange}
            options={[
              { value: 'PORTRAIT', label: intl.formatMessage({ id: 'pages.draw.PORTRAIT' }) },
              { value: 'SQUARE', label: intl.formatMessage({ id: 'pages.draw.SQUARE' }) },
              { value: 'LANDSCAPE', label: intl.formatMessage({ id: 'pages.draw.LANDSCAPE' }) },
            ]}
            optionType="button"
          />
          <Button type="primary" onClick={submit} loading={submitLoading}>
            {intl.formatMessage({ id: 'pages.draw.submitTask' })}
          </Button>
          {/* </Space> */}
        </Flex>
      );
    } else if (action === 'describe') {
      return (
        <Flex gap="small" align="center">
          <Select
            value={botType}
            onChange={handleBotTypeChange}
            defaultValue="MID_JOURNEY"
            style={{ width: 120 }} // 调整宽度
            options={bot_options}
          />

          <Select
            value={isFace ? 'swap' : action}
            style={{ width: 150 }}
            onChange={handleActionChange}
            options={options}
          />
          <Upload {...props}>
            {images.length >= 1 ? null : <Button icon={<UploadOutlined />}></Button>}
          </Upload>
          {/* <Upload {...props}>{images.length >= 1 ? null : uploadButton}</Upload> */}
          <Button
            // style={{ marginTop: '10px' }}
            type="primary"
            onClick={submit}
            loading={submitLoading}
          >
            {intl.formatMessage({ id: 'pages.draw.submitTask' })}
          </Button>
        </Flex>
      );
    } else if (action === 'shorten') {
      return (
        <Flex style={{ width: '100%' }} gap={6}>
          <Select
            value={botType}
            onChange={handleBotTypeChange}
            defaultValue="MID_JOURNEY"
            style={{ width: 120 }} // 调整宽度
            options={bot_options}
          />

          <Select
            value={isFace ? 'swap' : action}
            style={{ width: 150 }}
            onChange={handleActionChange}
            options={options}
          />
          <TextArea
            placeholder="Prompt"
            value={prompt}
            onChange={handlePromptChange}
            // onPressEnter={submit}
            autoSize={{ minRows: 1, maxRows: 12 }}
            onKeyDown={(e) => {
              // 如果是 Shift + Enter，允许换行
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // 阻止默认换行
                submit(); // 提交
              }
            }}
          />
          <Button type="primary" onClick={submit} loading={submitLoading}>
            {intl.formatMessage({ id: 'pages.draw.submitTask' })}
          </Button>
        </Flex>
      );
    }
    return <></>;
  };

  const clearCanvas = () => {
    const canvas: any = document.getElementById('canvas');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'blue';
  };

  const confirmModal = () => {
    if (!modalImage) {
      return <TextArea rows={3} value={customPrompt} onChange={handleCustomPromptChange} />;
    }
    if (modalRemix) {
      return (
        <Flex vertical>
          <Button style={{ marginBottom: '10px' }} icon={<ClearOutlined />} onClick={clearCanvas}>
            {intl.formatMessage({ id: 'pages.draw.clear' })}
          </Button>
          <canvas
            style={{ backgroundImage: `url('${modalImage}')`, backgroundSize: '100% 100%' }}
            id="canvas"
            width="550"
            height={modalImageHeight}
          ></canvas>
          <TextArea
            style={{ marginTop: '10px' }}
            rows={2}
            value={customPrompt}
            onChange={handleCustomPromptChange}
          />
        </Flex>
      );
    }
    return (
      <Flex vertical>
        <Button style={{ marginBottom: '10px' }} icon={<ClearOutlined />} onClick={clearCanvas}>
          {intl.formatMessage({ id: 'pages.draw.clear' })}
        </Button>
        <canvas
          style={{ backgroundImage: `url('${modalImage}')`, backgroundSize: '100% 100%' }}
          id="canvas"
          width="550"
          height={modalImageHeight}
        ></canvas>
      </Flex>
    );
  };

  function customRequest(option: any) {
    option.onSuccess();
  }

  const beforeUpload = (file: RcFile) => {
    const isJpgOrPng =
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      file.type === 'video/mp4' ||
      file.type === 'image/webp';
    if (!isJpgOrPng) {
      message.error(intl.formatMessage({ id: 'pages.draw.onlyJpgPng' }));
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error(intl.formatMessage({ id: 'pages.draw.limit10M' }));
    }
    return (isJpgOrPng && isLt10M) || Upload.LIST_IGNORE;
  };

  const props: UploadProps = {
    customRequest,
    beforeUpload,
    fileList: images,
    onChange(info) {
      setImages(info.fileList);
    },
    showUploadList: {
      showRemoveIcon: true,
      showPreviewIcon: false,
    },
  };

  const swap1Props: UploadProps = {
    customRequest,
    beforeUpload,
    maxCount: 1,
    fileList: swapImages1,
    onChange(info) {
      setSwapImages1(info.fileList);
    },
    showUploadList: {
      showRemoveIcon: true,
      showPreviewIcon: false,
    },
  };

  const swap2Props: UploadProps = {
    customRequest,
    beforeUpload,
    maxCount: 1,
    fileList: swapImages2,
    onChange(info) {
      setSwapImages2(info.fileList);
    },
    showUploadList: {
      showRemoveIcon: true,
      showPreviewIcon: false,
    },
  };

  // 参数切换区
  const switchArea = () => {
    // let options;
    // let isFace = false;
    // if (botType === 'INSIGHT_FACE' || botType === 'FACE_SWAP' || botType === 'VIDEO_FACE_SWAP') {
    //   isFace = true;
    //   options = [{ value: 'swap', label: '/swap' }];
    // } else {
    //   options = [
    //     { value: 'imagine', label: '/imagine' },
    //     { value: 'blend', label: '/blend' },
    //     { value: 'describe', label: '/describe' },
    //     { value: 'shorten', label: '/shorten' },
    //     { value: 'showjobid', label: '/show job_id' },
    //     { value: 'show', label: '/show task_id' },
    //   ];
    // }

    const accountOpts = accounts.map((account: any) => {
      return {
        value: account.channelId,
        label: account.channelId + ' - ' + (account.remark || ''),
        disabled: !account.enable || !account.running,
      };
    });
    return (
      <Space style={{ marginBottom: '10px' }}>
        {/* <Select
          value={isFace ? 'swap' : action}
          style={{ width: 150 }}
          onChange={handleActionChange}
          options={options}
        /> */}

        {/* <Select
          value={curAccount}
          style={{ width: 320 }}
          onChange={handleAccountChange}
          options={accountOpts}
          allowClear
          placeholder={intl.formatMessage({ id: 'pages.draw.selectAccount' })}
        /> */}

        {/* <Radio.Group
          value={botType}
          onChange={handleBotTypeChange}
          options={[
            { value: 'MID_JOURNEY', label: 'Midjourney' },
            // { value: 'NIJI_JOURNEY', label: 'niji・journey' },
            // { value: 'INSIGHT_FACE', label: 'InsightFace' },
            // { value: 'FACE_SWAP', label: 'FaceSwap' },
            // { value: 'VIDEO_FACE_SWAP', label: 'Video・FaceSwap' },
          ]}
          optionType="button"
        /> */}
      </Space>
    );
  };

  // 账号切换后刷新tasks值并重新按账号获取数据
  useEffect(() => {
    const loadData = async () => {
      setTasks([]);
      setPage(1);
      await loadMoreData(); // 首次加载, 加载十条, 首次加载时滚动到底部
      scrollToBottom(); // 滚动到底部
    };
    loadData();

    if (syncRunningTasksFutureRef.current) {
      clearInterval(syncRunningTasksFutureRef.current);
    }

    syncRunningTasksFutureRef.current = setInterval(() => {
      if (waitTaskIds.size === 0) return;
      syncRunningTasks();
    }, 2000);

    return () => {
      if (syncRunningTasksFutureRef.current) {
        clearInterval(syncRunningTasksFutureRef.current);
        syncRunningTasksFutureRef.current = null;
      }
    };
  }, [curAccount]);

  // useEffect(() => {
  //   const loadData = async () => {
  //     await loadMoreData(); // 首次加载, 加载十条, 首次加载时滚动到底部
  //     scrollToBottom(); // 滚动到底部
  //   };
  //   loadData();

  //   if (syncRunningTasksFutureRef.current) {
  //     clearInterval(syncRunningTasksFutureRef.current);
  //   }

  //   syncRunningTasksFutureRef.current = setInterval(() => {
  //     if (waitTaskIds.size === 0) return;
  //     syncRunningTasks();
  //   }, 2000);

  //   return () => {
  //     if (syncRunningTasksFutureRef.current) {
  //       clearInterval(syncRunningTasksFutureRef.current);
  //       syncRunningTasksFutureRef.current = null;
  //     }
  //   };
  // }, []); // 空依赖数组，仅在组件挂载时执行一次

  return (
    // <div
    //   id="draw-container"
    //   style={{
    //     // display: 'flex',
    //     // flexDirection: 'column',
    //     // height: '100vh',
    //     // paddingTop: '48px',
    //     height: '100%',
    //     // height: 'calc(100vh - 48px)', // 减去顶部 header 的高度
    //     overflow: 'hidden',
    //   }}
    // >
    // <PageContainer
    //   header={{
    //     title: false,
    //     breadcrumb: {},
    //   }}
    //   content={false}
    //   token={{
    //     paddingBlockPageContainerContent: 0,
    //     paddingInlinePageContainerContent: 0,
    //   }}
    //   style={{
    //     // padding: 0,
    //     overflow: 'hidden',
    //   }}
    // >
    <div
      id="draw-container"
      style={{
        // padding: 0,
        height: 'calc(100vh - 56px)',
        overflow: 'hidden',
      }}
    >
      <Layout
        // className={`flex flex-col ml-[200px]`}
        style={{
          // paddingTop: '48px',
          // height: '100%',
          // minHeight: '100%',
          // overflow: 'auto',
          // marginTop: '56px',

          height: '100vh', // 减去顶部 header 的高度
          // flex: '1 1 0%',
          overflow: 'hidden',
        }}
      >
        {/* <Header style={{ background: '#fff', padding: 0 }}>
       
      </Header> */}
        <Sider
          // collapsible
          // collapsed={collapsed}
          // onCollapse={(value) => setCollapsed(value)} // 折叠状态改变时的回调
          width={300}
          // collapsedWidth={80}
          trigger={null} // 隐藏默认触发器
          style={{
            borderRight: '1px solid #f0f0f0',
            background: '#fafafa',
            // minHeight: '100%',
            position: 'sticky',
            // top: 56,
            maxHeight: 'calc(100vh - 56px)',
            // height: 'calc(100vh - 56px)',
            // flexDirection: 'column',
            overflow: 'auto',

            // flex: '1 1 0%',
            // overflow: 'hidden auto',
            // top: 48,
          }}
        >
          <div
            style={{
              height: '48px',
              lineHeight: '48px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              borderBottom: '1px solid #f0f0f0',
            }}
            // onClick={() => setCollapsed(!collapsed)}
          >
            {/* 左侧Logo或标题 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                opacity: collapsed ? 0 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <img src="./midjourney.webp" alt="logo" style={{ width: 20, marginRight: 8 }} />
              {!collapsed && <span>{intl.formatMessage({ id: 'pages.draw2.channelList' })}</span>}
            </div>

            {/* 右侧折叠按钮 */}
            {collapsed && (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: '16px' }}
              />
            )}
          </div>

          {/* <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleCollapse}
        /> */}
          <ChannelList
            accounts={accounts}
            curAccount={curAccount}
            onAccountChange={handleAccountChange}
          />
        </Sider>
        <Content
          style={{
            // marginLeft: collapsed ? '80px' : '300px',
            // marginTop: '48px',
            height: '100vh',
            display: 'flex',
            // flex: 1,
            flexDirection: 'column',
            // padding: '20px',
            overflow: 'auto',
          }}
        >
          {/* <div
          style={{
            display: 'flex',
            // flex: '1 1 0%',
            flex: '1 1 0%',
            flexDirection: 'column',
            height: '100%',
            overflow: 'auto',
          }}
        > */}
          {contextHolder}
          {/* 任务面板 */}
          {dataLoading && (
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <Spin tip="Loading" />
            </div>
          )}
          {taskCardList()}
          <Card
            style={{
              // left: collapsed ? '80px' : '300px', // 根据 Sider 宽度调整
              // width: `calc(100% - ${collapsed ? '80px' : '300px'})`, // 动态计算宽度
              // width: '100%', // 动态计算宽度
              marginBottom: '56px',
              padding: 0,
              flexShrink: 1,
              // height: '100px',
              // minHeight: '100px',
              // width: '100%',
              // flex: '0 0 auto',
              // marginTop: 'auto',
            }}
          >
            {switchArea()}
            {actionArea()}
          </Card>
          <Modal
            title={modalTitle}
            open={modalVisible}
            onCancel={cancelModal}
            onOk={submitModal}
            confirmLoading={loadingModal}
            width={600}
          >
            {confirmModal()}
          </Modal>
          {/* </div> */}
        </Content>
      </Layout>
    </div>
    // </PageContainer>
  );
};

export default Draw;
