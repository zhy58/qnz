import React, { Component } from 'react'
import { StyleSheet, View, ImageBackground, FlatList, Platform, Dimensions, BackHandler, NativeModules } from 'react-native'
import { connect } from 'react-redux'
import I18n from 'i18n-js'
import Modal from 'react-native-modal'
import Icon from 'react-native-vector-icons/Ionicons'

import { Image, IconButton, ImageButton, CtrlList, ScrollView, Touchable, Text } from '../components'
import BLE from '../native'
import { Storage, NavigationActions, createAction, Toast } from '../utils'
import { Instructions, StorageKey } from '../utils/config'
import tool from './style/style'
import Reminder from './Reminder'

const { width, height } = Dimensions.get("window");
let deviceHeight = Dimensions.get('window').height/Dimensions.get('window').width > 1.8 ? height + NativeModules.StatusBarManager.HEIGHT :  height;

@connect(({ app }) => ({ ...app }))
class Home extends Component {
  constructor(props) {
    super(props);
    this.iSize = 34;
    this.state = {
      isVisible: false,
      refresh: false,
      isAcceptModal: true
    }
  }
  componentWillMount() {
    this.initBle();
  }
  componentDidMount() {
    this.initAccept();
  }
  componentWillReceiveProps(nextProps){
    this.setState({
      refresh: nextProps.refresh
    });
    if(nextProps.refresh){
      this.props.dispatch(createAction("app/updateState")({ refresh: false }));
      this.initAccept();
    }
  }
  componentWillUnmount() {}
  initAccept = () => {
    Storage.get(StorageKey.reminder).then(res => {
      // console.log("res: ", res);
      this.setState({
        isAcceptModal: true
      });
      this.props.dispatch(createAction("app/updateState")({ isAccept: res }));
    }).catch(err => {
        console.log("get StorageKey.reminder err: ", err);
    });
  }
  judgeDevice = _ => {
    if(this.props.currentDevice && this.props.currentDevice.name && this.props.currentDevice.id){
      return true;
    }
    Toast(I18n.t("selectDeviceTip"));
    return false;
  }
  judgePower = _ => {
    if(this.props.power === Instructions.powerOn){
      return true;
    }
    Toast(I18n.t("openDeviceTip"));
    return false;
  }
  power = _ => {
    const that = this;
    BLE.checkBLEState().then(res => {
        if(res && res.status){
            if(that.judgeDevice()){
                const power = that.props.power === Instructions.powerOff ? Instructions.powerOn : Instructions.powerOff;
                BLE.send(power, that.props.currentDevice.id).then(({status}) => {
                  console.log("status: ", status);
                  if(status == 0){
                    that.props.dispatch(createAction("app/updateState")({ power }));
                  }
                });
            }
        }else{
            Toast(I18n.t("openBLETip"));
        }
    }).catch(err => {
        console.log("isBLEEnabled err: ", err);
    });
    
  }
  sendOrder(order) {
    console.log(order);
    const that = this;
    BLE.checkBLEState().then(res => {
        if(res && res.status){
            if(that.judgeDevice() && that.judgePower()){
              console.log(order);
                BLE.send(order, that.props.currentDevice.id).then(res => {
                  if(res.status == 4){
                    Toast(I18n.t("openDeviceTip"));
                  }
                }).catch(err => {
                  console.log("sendOrder err", err);
                });
              }
        }else{
            Toast(I18n.t("openBLETip"));
        }
    }).catch(err => {
        console.log("isBLEEnabled err: ", err);
    });
    
  }
  select = _ => {
    this.setState({ isVisible: true });
  }
  closeModal = _ => {
    this.setState({ isVisible: false });
  }
  goLanguage = _ => {
    this.props.dispatch(NavigationActions.navigate({ routeName: 'Language' }))
  }
  goMore = _ => {
    this.props.dispatch(NavigationActions.navigate({ routeName: 'More' }))
  }
  selectDevice(currentDevice) {
    this.closeModal();
    this.props.dispatch(createAction("app/updateState")({ currentDevice }));
    BLE.choose(currentDevice.id, currentDevice.name).then(res => {
        console.log("res: ", res);
      this.props.dispatch(createAction("app/currentDevice")());
    }).catch(err => {
      console.log("err: ", err);
    });
  }
  initBle = _ => {
    BLE.initBLE();
    this.props.dispatch(createAction("app/getDevices")());
    this.props.dispatch(createAction("app/currentDevice")());
  }
  noAccept = () => {
    this.setState({
      isAcceptModal: false
    })
  }
  cancle = () => {
    if(Platform.OS == "android"){
      BackHandler.exitApp()
    }
  }
  comfirm = () => {
    this.closeModal()
    Storage.set(StorageKey.reminder, true);
    this.props.dispatch(createAction("app/updateState")({ isAccept: true }));
  }
  goAgrrement = () => {
    this.noAccept()
    this.props.dispatch(NavigationActions.navigate({ routeName: 'Agreement', params: true }))
  }
  render() {
    if (!this.props.isAccept) return <Reminder isVisible={this.state.isAcceptModal} lonPress={this.cancle} ronPress={this.comfirm} go={this.goAgrrement} />

    return (
        <ImageBackground style={styles.bgImage} source={require('../images/background.png')}>
          <ScrollView style={{backgroundColor: "transparent"}}>
            {/* header */}
            {this.renderHeaderView()}

            <View style={styles.main}>
              {/* 上升、下降 */}
              {this.renderUpDownView()}

              {/* 圆形方位按钮 */}
              {this.renderCircleBtnView()}
              
              {/* 全加、全减 */}
              {this.renderAddSubtView()}

              {/* 定时、保暖、烹饪 */}
              {this.renderOtherBtnView()}
            </View>
            
          </ScrollView>
          {this.renderDeviceModal()}
        </ImageBackground>
    )
  }
  renderHeaderView = () => {
    let dev = this.props.currentDevice || {};
    const selectDeviceName = dev.name ? dev.name : I18n.t("selectDevice");
    return (
      <View style={[styles.header, tool.flexBetween]}>
        <Text style={styles.add} />
        <Touchable style={[styles.select, tool.flexCenter]} onPress={this.select}>
          <Text style={[tool.weight, styles.titleText]}>{ selectDeviceName }</Text>
        </Touchable>
        <IconButton color={"#fff"} onPress={this.goMore} type={"Octicons"} name={"gear"} size={28} style={styles.add} />
      </View>
    )
  }
  renderUpDownView = () => {
    return (
      // <View style={tool.marginT10}>
        <View style={[tool.flexAround, tool.paddingH20]}>
          <Touchable style={tool.flexCenter} onPress={() => {this.sendOrder(Instructions.i10)}}>
            <View style={[tool.flexCenter, styles.footerBtn]} >
              <Icon name={"ios-cloud-upload"} color={styles.red.color} size={this.iSize} />
            </View>
            <Text style={[styles.text, styles.marginT3]}>上升</Text>
          </Touchable>
          <Text style={{width: 60}} />
          <Touchable style={tool.flexCenter} onPress={() => {this.sendOrder(Instructions.i11)}}>
            <View style={[tool.flexCenter, styles.footerBtn]} >
              <Icon name={"ios-cloud-download"} color={styles.red.color} size={this.iSize} />
            </View>
            <Text style={[styles.text, styles.marginT3]}>下降</Text>
          </Touchable>
        </View>
      // </View>
    )
  }
  renderCircleBtnView = () => {
    let powerColor = this.props.power === Instructions.powerOn ? styles.powerGreen : styles.powerRed;
    return (
      <View style={[styles.ctrl]}>
        <View style={[styles.wcircle, tool.flexCenter]}>
          <View style={[styles.ncircle, {borderColor: styles.red.color,borderWidth: 0.5,overflow: 'hidden',position:'relative'}]}>
            <View style={{height: '50%', width: '100%', flexDirection: "row"}}>
              <Touchable style={{flex: 1,borderColor: styles.red.color,borderWidth: 0.25,justifyContent:"center",alignItems:'center'}} onPress={() => {this.sendOrder(Instructions.i8)}}>
                <Icon style={{transform: [{rotate:'-45deg'},{translateX: -6}],marginBottom: 6}} name={"ios-arrow-up"} color={styles.red.color} size={24} />
                <Text style={[styles.red, {transform: [{rotate:'-45deg'},{translateX: 15}]}]}>左前</Text>
              </Touchable>
              <Touchable style={{flex: 1,borderColor: styles.red.color,borderWidth: 0.25,justifyContent:"center",alignItems:'center'}} onPress={() => {this.sendOrder(Instructions.i7)}}>
                <Icon style={{transform: [{rotate:'45deg'},{translateX: 6}],marginBottom: 6}} name={"ios-arrow-up"} color={styles.red.color} size={24} />
                <Text style={[styles.red, {transform: [{rotate:'45deg'},{translateX: -15}]}]}>右前</Text>
              </Touchable>
            </View>
            <View style={{height: '50%', width: '100%', flexDirection: "row"}}>
              <Touchable style={{flex: 1,borderColor: styles.red.color,borderWidth: 0.25,justifyContent:"center",alignItems:'center'}} onPress={() => {this.sendOrder(Instructions.i6)}}>
                <Text style={[styles.red, {transform: [{rotate:'45deg'},{translateX: 15}]}]}>左后</Text>
                <Icon style={{transform: [{rotate:'225deg'},{translateX: 6}],marginTop: 6}} name={"ios-arrow-up"} color={styles.red.color} size={24} />
              </Touchable>
              <Touchable style={{flex: 1,borderColor: styles.red.color,borderWidth: 0.25,justifyContent:"center",alignItems:'center'}} onPress={() => {this.sendOrder(Instructions.i9)}}>
                <Text style={[styles.red, {transform: [{rotate:'-45deg'},{translateX: -15}]}]}>右后</Text>
                <Icon style={{transform: [{rotate:'135deg'},{translateX: -6}],marginTop: 6}} name={"ios-arrow-up"} color={styles.red.color} size={24} />
              </Touchable>
            </View>
            <View style={[styles.mcircle, tool.flexCenter, {position: 'absolute',top:'50%',marginTop: -44}]}>
              <Touchable style={[tool.flexCenter, styles.power, powerColor]} onPress={this.power}>
                <Icon name={"ios-power"} color={'#fff'} size={this.iSize} />
              </Touchable>
            </View>
          </View>
        </View>
      </View>
    )
  }
  renderAddSubtView = () => {
    return (
      <View style={[tool.paddingH30, tool.flexBetween]}>
        <Touchable onPress={() => {this.sendOrder(Instructions.i2)}} style={[styles.rectBox, tool.flexAround]}>
          <Text style={styles.red}>全加</Text>
        </Touchable>
        <Touchable onPress={() => {this.sendOrder(Instructions.i3)}} style={[styles.rectBox, tool.flexAround]}>
          <Text style={styles.red}>全减</Text>
        </Touchable>
      </View>
    )
  }
  renderOtherBtnView = () => {
    return (
      // <View style={tool.marginT30}>
        <View style={[tool.flexAround, tool.paddingH20]}>
          <Touchable style={[tool.flexCenter]} onPress={() => {this.sendOrder(Instructions.i4)}}>
            <View style={[tool.flexCenter, styles.footerBtn]} >
              <Icon name={"ios-stopwatch"} color={styles.red.color} size={this.iSize} />
            </View>
            <Text style={[styles.text, styles.marginT3]}>定时</Text>
          </Touchable>
          <Touchable style={[tool.flexCenter]} onPress={() => {this.sendOrder(Instructions.i5)}}>
            <View style={[tool.flexCenter, styles.footerBtn]}>
              <Icon name={"md-sunny"} color={styles.red.color} size={this.iSize} />
            </View>
            <Text style={[styles.text, styles.marginT3]}>保暖</Text>
          </Touchable>
          <Touchable style={[tool.flexCenter]} onPress={() => {this.sendOrder(Instructions.i16)}}>
            <View style={[tool.flexCenter, styles.footerBtn]}>
              <Icon name={"ios-bonfire"} color={styles.red.color} size={this.iSize} />
            </View>
            <Text style={[styles.text, styles.marginT3]}>烹饪+</Text>
          </Touchable>
          <Touchable style={[tool.flexCenter]} onPress={() => {this.sendOrder(Instructions.i17)}}>
            <View style={[tool.flexCenter, styles.footerBtn]}>
              <Icon name={"md-bonfire"} color={styles.red.color} size={this.iSize} />
            </View>
            <Text style={[styles.text, styles.marginT3]}>烹饪-</Text>
          </Touchable>
        </View>
      // </View>
    )
  }
  renderDeviceModal = () => {
    return (
      <Modal isVisible={this.state.isVisible} 
        style={styles.modal}
        swipeDirection={['down']}
        onSwipeComplete={this.closeModal}
        scrollOffsetMax={height - 200}
        onBackdropPress={this.closeModal}
        onBackButtonPress={this.closeModal}>
          <View style={styles.mask}>
            <FlatList showsVerticalScrollIndicator={false}
              style={tool.container}
              keyExtractor={(item, index) => index.toString()}
              data={this.props.devices} 
              renderItem={({item, index}) => (
                <Touchable style={styles.selectList} onPress={_=>{this.selectDevice(item)}}>
                  <Text key={index} style={styles.selectText}>{item.name}</Text>
                </Touchable>
              )} />
          </View>
      </Modal>
    )
  }
}

const styles = StyleSheet.create({
  bgImage: {
    height: height,
    width: width,
    flex: 1,
  },
  header: {
    marginTop: Platform.select({
      ios: 20,
      android: 0
    }),
    paddingHorizontal: 1,
    paddingVertical: 5,
    height: 50,
    overflow: 'hidden',
  },
  back: {
    height: 40
  },
  add: {
    height: 40,
    width: 50,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  flexRowCenter: {
    display: 'flex',
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    marginLeft: 10
  },
  titleText: {
    color: "#ffffff",
    fontSize: 20
  },
  text: {
    color: "#ffffff",
    fontSize: 18
  },
  marginT3: {
    marginTop: 3,
  },
  ctrl: {
    justifyContent: "center",
    alignItems: "center",
  },
  wcircle: {
    width: 0.66*width,
    height: 0.66*width,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 0.33*width,
  },
  ncircle: {
    width: 0.56*width,
    height: 0.56*width,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 0.29*width,
    alignItems: "center",
    justifyContent: 'space-between'
  },
  red: {
    color: "rgb(249,61,75)",
    fontSize: 18,
  },
  ctrl1: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  ctrl2: {
    justifyContent: "space-between",
    flexDirection: 'row',
    width: 0.56*width,
    paddingHorizontal: 10,
  },
  ctrl3: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  ml5: {
    marginLeft: 5,
  },
  mr5: {
    marginRight: 5,
  },
  mcircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderColor: '#ccc',
    backgroundColor: "#fff",
    elevation:1.5,
    // shadowColor: '#ccc',
    // shadowOffset:{
    //   width:0,
    //   height:0
    // },
    // shadowOpacity: 1,
    // shadowRadius: 1.5,
  },
  power: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  powerRed: {
    backgroundColor: "rgb(255,98,98)",
  },
  powerGreen: {
    backgroundColor: "#42C679",
  },
  footerBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgb(255,255,255)",
  },
  marginT40: {
    marginTop: 40,
  },
  rectBox: {
    width: 120,
    height: 50,
    borderRadius: 30,
    backgroundColor: "#fff",
    borderColor: "#fff",
    borderWidth: 0.5,
  },
  rectBtn: {
    height: 56,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  bar: {
    paddingHorizontal: 20,
    height: 50,
    justifyContent: "center",
    overflow: "hidden",
  },
  select: {
    height: 40,
    flex: 1,
  },
  modal: {
    justifyContent: "flex-end",
    margin: 0
  },
  mask: {
    height: 200,
    borderRadius: 5,
    paddingVertical: 39,
    backgroundColor: "#FFFFFF"
  },
  selectList: {
    paddingVertical: 8,
  },
  selectText: {
    fontSize: 16,
    color: "rgb(249,61,75)",
    fontWeight: "500",
    textAlign: "center"
  },
  main: {
    justifyContent: 'space-around',
    height: deviceHeight - 75
  }
})

export default Home
// export default copilot({
//     verticalOffset: Platform.OS == "android" ? 23 : 0,
//     animated: true,
//     overlay: 'svg',
// })(Home)
