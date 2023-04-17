import FullscreenIcon from "@mui/icons-material/Fullscreen";
import PersonalVideoIcon from "@mui/icons-material/PersonalVideo";
import PhoneDisabledIcon from "@mui/icons-material/PhoneDisabled";
import SearchIcon from "@mui/icons-material/Search";
import SubjectIcon from "@mui/icons-material/Subject";
import TabIcon from "@mui/icons-material/Tab";
import AspectRatio from "@mui/joy/AspectRatio";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import CardCover from "@mui/joy/CardCover";
import { Fab } from "@mui/material";
import MuiAppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import {
  alpha,
  styled,
  useTheme,
} from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { io } from "socket.io-client";

const drawerWidth = 260;

const Main = styled("main", {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(0),
  transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginRight: -drawerWidth,
  ...(open && {
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: 0,
  }),
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  transition: theme.transitions.create(
    ["margin", "width"],
    {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }
  ),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(
      ["margin", "width"],
      {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }
    ),
    marginRight: drawerWidth,
  }),
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: "flex-start",
}));

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(
      theme.palette.common.white,
      0.25
    ),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(1),
    width: "auto",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 0),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(5)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "17ch",
    },
  },
}));

const StyledFab = styled(Fab)({
  position: "absolute",
  zIndex: 1,
  top: -30,
  left: 0,
  right: 0,
  margin: "0 auto",
});

const StyledFabWebCam = styled(Fab)({
  position: "absolute",
  zIndex: 1,
  top: -30,
  left: -90,
  right: 0,
  margin: "0 auto",
});

const StyledFabScreen = styled(Fab)({
  position: "absolute",
  zIndex: 1,
  top: -30,
  left: 0,
  right: -90,
  margin: "0 auto",
});

const socket = io("http://localhost:5000", {
  autoConnect: false,
});

export default function Home() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [isConn, setIsConn] = useState(false);
  const [isInit, setIsInit] = useState();
  const [stream, setStream] = useState();
  const [remote, setRemote] = useState([]);

  const mainScrRef = useRef();
  const listScrRef = useRef([]);

  const handleTrackEnd = () => {
    setIsInit(false);
    setStream(undefined);
    setRemote(remote.filter((p) => p.id !== socket.id));
  };

  const handleDrawer = () => {
    setOpen(!open);
  };

  useEffect(() => {
    socket.connect();

    function onConnect() {
      setIsConn(true);
    }

    function onDisconnect() {
      setIsConn(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (!isConn) {
      return;
    }

    if (isInit) {
      socket.emit("stream");
    }
  }, [isConn, isInit]);

  useEffect(() => {
    if (!isConn) {
      return;
    }

    function onStream(id) {
      const peer = new Peer({
        initiator: true,
        stream,
      });

      peer.on("signal", (s) => {
        socket.emit("signal", id, s);
      });

      peer.on("stream", (data) => {
        const v = listScrRef.current.find(
          (ref) => ref && ref.id === id
        );
        if (v) {
          v.srcObject = data;
        }
      });

      peer.on("connect", () => {
        setNotify({
          isOpen: true,
          msg: `${id} is streaming`,
        });
      });

      const index = remote.findIndex((p) => p.id === id);
      if (index > -1) {
        remote[index] = {
          id,
          init: true,
          peer,
        };
        setRemote([...remote]);
        return;
      }

      setRemote([
        {
          init: true,
          id,
          peer,
        },
        ...remote,
      ]);
    }

    socket.on("stream", onStream);

    if (!isInit && stream) {
      setRemote([
        {
          init: true,
          id: socket.id,
          peer: new Peer(),
        },
        ...remote,
      ]);
      setIsInit(true);
    }

    return () => {
      socket.off("stream", onStream);
    };
  }, [isConn, isInit, remote, stream]);

  useEffect(() => {
    if (!isConn) {
      return;
    }

    function onSignal(id, s) {
      const p = remote.find((p) => p.id === id);
      if (p) {
        p.peer.signal(s);
      }
    }

    function onOff(id) {
      setRemote(remote.filter((p) => p.id !== id));
    }

    socket.on("signal", onSignal);
    socket.on("off", onOff);

    if (remote.length) {
      if (remote[0].id === socket.id) {
        let vid = listScrRef.current.find(
          (v) => v.id === socket.id
        );
        if (vid) {
          vid.srcObject = mainScrRef.current.srcObject;
        }
      }
    }

    return () => {
      socket.off("signal", onSignal);
      socket.off("off", onOff);
    };
  }, [isConn, remote]);

  useEffect(() => {
    if (!isConn) {
      return;
    }

    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener("ended", handleTrackEnd);
        return () => {
          track.removeEventListener(
            "ended",
            handleTrackEnd
          );
        };
      }
    }
  }, [isConn, stream]);

  const handleStreamScreen = async () => {
    const getStream = async () => {
      const stream =
        await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

      mainScrRef.current.srcObject = stream;

      return stream;
    };

    setStream(await getStream());
  };

  const handleStopStream = () => {
    stream.getTracks().forEach((t) => t.stop());
    handleTrackEnd();
  };

  if (!isConn) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "fixed",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Button
          loading
          loadingPosition="start"
          variant="plain"
        >
          Connecting socket...
        </Button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Meeting</title>
        <meta
          name="description"
          content="Generated by create next app"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Box
        sx={{
          display: "flex",
        }}
      >
        <AppBar
          open={open}
          position="fixed"
          color="primary"
          sx={{ top: "auto", bottom: 0 }}
        >
          <Toolbar>
            <Typography
              variant="h6"
              noWrap
              sx={{ flexGrow: 1 }}
              component="div"
            >
              Meeting App
            </Typography>
            {isInit ? (
              <StyledFab
                color="error"
                aria-label="close"
                onClick={handleStopStream}
              >
                <PhoneDisabledIcon />
              </StyledFab>
            ) : (
              <>
                <Tooltip
                  title="Share camera"
                  placement="top"
                >
                  <StyledFabWebCam
                    color="success"
                    aria-label="webcam"
                  >
                    <PersonalVideoIcon />
                  </StyledFabWebCam>
                </Tooltip>
                <Tooltip
                  title="Share screen"
                  placement="top"
                >
                  <StyledFabScreen
                    color="success"
                    aria-label="screen"
                    onClick={handleStreamScreen}
                  >
                    <TabIcon />
                  </StyledFabScreen>
                </Tooltip>
              </>
            )}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="end"
              onClick={handleDrawer}
            >
              {open ? <FullscreenIcon /> : <SubjectIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>
        <Main
          open={open}
          sx={{
            height: `calc(100vh - ${theme.spacing(10)})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Card
            sx={{
              width: "100%",
              height: "100%",
              bgcolor: "initial",
              boxShadow: "none",
              "--Card-padding": "0px",
            }}
            variant="outlined"
          >
            <CardCover>
              <video ref={mainScrRef} autoPlay muted />
            </CardCover>
          </Card>
        </Main>
        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
            },
          }}
          variant="persistent"
          anchor="right"
          open={open}
        >
          <DrawerHeader>
            <Search>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <StyledInputBase
                placeholder="Search…"
                inputProps={{ "aria-label": "search" }}
              />
            </Search>
          </DrawerHeader>
          <Divider />
          <List
            sx={{
              position: "relative",
            }}
          >
            {remote
              .filter(({ init }) => init)
              .map(({ id }) => (
                <ListItem key={id} disablePadding>
                  <Card
                    sx={{
                      width: "100%",
                      mb: 1,
                      mx: 0.5,
                      bgcolor: "initial",
                      boxShadow: "none",
                      "--Card-padding": "0px",
                    }}
                    variant="outlined"
                  >
                    <AspectRatio sx={{ width: "100%" }}>
                      <CardCover>
                        <video
                          id={id}
                          ref={(ref) =>
                            (listScrRef.current = [
                              ref,
                              ...listScrRef.current,
                            ])
                          }
                          autoPlay
                          muted
                        />
                      </CardCover>
                      <CardContent
                        sx={{ justifyContent: "flex-end" }}
                      >
                        <Typography
                          level="h2"
                          fontSize="lg"
                          mb={1}
                        >
                          Yosemite National Park
                        </Typography>
                      </CardContent>
                    </AspectRatio>
                  </Card>
                </ListItem>
              ))}
          </List>
        </Drawer>
      </Box>
    </>
  );
}
