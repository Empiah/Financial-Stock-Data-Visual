import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import date, timedelta
import statsmodels.api as sm
import quandl #this is a package that can get stock data for us
import talib # this is a package that can perform technical analysis for us   

#the objective of this is to get stock data to enable us to produce the statistics that we want
#for this we will use quandl - it is easy to use and has its own package

quandl.ApiConfig.api_key = "EYNDSC9qo_AsccGyr4gR"

#in an excel document we have a list of all acceptable values that can be entered
available_tickers = pd.read_csv('Data/ticker_list.csv')

#the first part of this script will be confirming user inputs
############################################


#first of all we need to get some input from the user as to what stocks they want to see
def get_ticker():
    
    #general overview to the user of what this script will do
    print('This script will take some user input and display various statistics and graphs')
    
    #this will get some user input, it will only take valid inputs
    while True:
        try:
            ticker = str(input('\nPlease enter a stock ticker:\n'))
        #this will return if what is entered is not a string
        except ValueError:
            print('{} was not understood'.format(ticker))
            continue
        #this will return if what is entered is not in the csv above
        if available_tickers.ticker.isin([ticker.upper()]).any() == False:
            print('{} was not in the list of available tickers'.format(ticker))
            continue
        #if these criterias are all met then we can accept the input
        else:
            ticker = ticker.upper()
            break
    return ticker


def get_year():

    curr_year = date.today().year

    #this will get some user input, it will only take valid year inputs
    while True:
        try:
            year = int(input('\nPlease enter the year:\n'))
        #this will return if what is entered is not a string
        except ValueError:
            print('That was not understood, please try again')
            continue
        #this will return if the year that is entered is greater than the current year
        if year > curr_year:
            print('{} is not available'.format(year))
            continue
        #if these criterias are all met then we can accept the input
        else:
            year = year
            break
    return year


def get_month():
    #this will get some user input, it will only take valid month inputs
    while True:
        try:
            month = int(input('\nPlease enter the month in numbers (e.g 7):\n'))
        #this will return if what is entered is not a string
        except ValueError:
            print('That was not understood, please try again')
            continue
        #this will return if what is entered is greater than 12
        if month > 12:
            print('{} is not available'.format(month))
            continue
        #if these criterias are all met then we can accept the input
        else:
            month = month
            break
    return month


def get_day(month):
    #this will get some user input, it will only take valid month inputs

    month_28 = ('2')
    month_30 = ('4', '6', '9', '11')

    if str(month) in month_28:
        month_max = 28
    elif str(month) in month_30:
        month_max = 30
    else:
        month_max = 31

    while True:
        try:
            day = int(input('\nPlease enter the day in numbers (e.g 20):\n'))
        #this will return if what is entered is not a string
        except ValueError:
            print('That was not understood, please try again')
            continue
        #this will return if what is entered is greater than 12
        if day > month_max:
            print('{} is not available'.format(day))
            continue
        #if these criterias are all met then we can accept the input
        else:
            day = day
            break
    return day


def get_start_date(ticker):
    #we need to get the full start date
    print('\nIn this script we will look at stock data over a date range, please enter the start date')

    #this enables the user just to pick a time period, or select their own date
    while True:
        #here we are presenting the option that the user may want to view, say, the last 9 months
        #if they type 't' they can do that, if they select 'n' they can enter a date like normal
        start_or_period = str(input('\nIf you want to view a time period e.g T-6 months, enter "t" and if you want to select, type "n"\n'))
        if start_or_period.lower() == 't':
            while True:
                try:
                    #this is just the input that we request the information for
                    t_minus = int(input('Please enter how many months back you want to go, e.g. 3 for 3 months, or 36 for 3 years\n'))
                except ValueError:
                    print('Please try again, this was not valid')
                    continue
                else:
                    #this removes the amount of months from the start day, timedelta takes care of this for us
                    start_date = date.today() - timedelta(days=(t_minus * (365/12)))
                    break
            break
        #if this type 'n then they can pick a date like they did before
        elif start_or_period.lower() == 'n':
            #this will run some of the other functions to get some more information
            year = get_year()
            month = get_month()
            day = get_day(month)

            start_year = year
            start_month = month
            start_day = day

            #now we append dashes inbetween so that it is in the right format to be called from quandl
            start_date = str(start_year) + '-' + str(start_month) + '-' + str(start_day)
            break
        else:
            print('{} was not a valid input, please enter "t" for time period, or "n" to select'. format(start_or_period))
            continue

    #here we will pull the stock name from the sheet as we have been give then ticker
    ticker_confirm = available_tickers.loc[available_tickers['ticker'] == ticker, 'Company']

    #we will present this date to the user to confirm it
    while True:
        start_confirm = str(input('\nPlease confirm the input is correct \nStart Date = {}\nTicker = {}\n[y/n]:\n'.format(start_date, ticker_confirm)))
        if start_confirm.lower() == 'y':
            print('Thanks for confirming!\n')
            start_date = start_date
            break
        elif start_confirm.lower() == 'n':
            #if the user selects no, we will close the script
            print('\nOkay lets get that information again - the system will close, please run again to start\n')
            raise SystemExit
        else:
            #we will confirm the output
            print('Sorry that was not a valid input - please try again')
            continue

    return start_date


def get_end_date():
    
    print('\nWe also need the end date, you can enter a date or choose "latest" \n')

    #this enables the user just to pick the latest date, which would be todays date if they type 'l'
    while True:
        end_or_latest = str(input('If you want latest, type "l" and if you want to select, type "n"\n'))
        if end_or_latest.lower() == 'l':
            print('Thanks for selecting the most recent date')
            year = date.today().year
            month = date.today().month
            day = date.today().day
            break
        #if this type 'n then they can pick a date like they did before
        elif end_or_latest.lower() == 'n':
            year = get_year()
            month = get_month()
            day = get_day(month)
            break
        else:
            print('{} was not a valid input, please enter "l" for latest date, or "n" to select'. format(end_or_latest))
            continue
            
    end_year = year
    end_month = month
    end_day = day

    #now we append dashes inbetween so that it is in the right format to be called from quandl
    end_date = str(end_year) + '-' + str(end_month) + '-' + str(end_day)

    #we will present this date to the user to confirm it
    while True:
        end_confirm = str(input('\nPlease confirm the input is correct\nEnd Date = {}\n[y/n]\n'.format(end_date)))
        if end_confirm.lower() == 'n':
            #if the user selects no, we will close the script
            print('\nOkay lets get that information again - the system will close, please run again to start\n')
            raise SystemExit
        elif end_confirm.lower() == 'y':
            #we will confirm the output
            print('Thanks for confirming!')
            end_date = end_date
            break
        else:
            print('{} was not a valid input, please confirm with "y" or "n"'. format(end_confirm))
            continue
    
    return end_date



#the second part of this script will be getting the stock data and calculating the statistics we need
############################################



def get_stock_information(ticker, start_date, end_date):
    #we need to find a data service that we can use that will allow us to take stock data
    #we will use Quandl- we have made an account and our API key and data is at the top of this script

    stock_data = quandl.get_table('WIKI/PRICES', ticker = ticker, 
                        qopts = { 'columns': ['ticker', 'date', 'adj_close'] }, 
                        date = { 'gte': str(start_date), 'lte': str(end_date) })

    #here we are setting the date as the index which makes it easier to plot, we also dont need the ticker really
    stock_data.set_index('date', inplace=True)
    stock_data = stock_data[['adj_close']]
    
    return stock_data


def tech_indicator_calc(stock_data):
    #the first thing we will work out with our stock data is MACD
    #the formula we will use to calculate the moving average convergence divergence (macd) is as follows
    #(12 Day Exponential Moving Average (EMA) - 26 Day EMA)
    #instead of having to code the whole thing, we can use the talib module and input the below

    macd, macdsignal, macdhist = talib.MACD(stock_data['adj_close'], fastperiod=12, slowperiod=26, signalperiod=9)

    #we will also calculate the Relative Strength Index
    rsi = talib.RSI(stock_data['adj_close'], timeperiod=14)

    return macd, macdsignal, macdhist, rsi


def stock_regression(stock_data):
    #this will create some regression data so that we can plot it
    #at the moment this is just simple linear regression
    stock_data['regression'] = sm.OLS(stock_data['adj_close'], sm.add_constant(range(len(stock_data.index)),
                                prepend=True)).fit().fittedvalues

    stock_data['ema12'] = stock_data['adj_close'].ewm(com=12).mean()
    stock_data['ema26'] = stock_data['adj_close'].ewm(com=26).mean()

    return stock_data

#the third part of this script will be plotting the data
###########################################



def plot_graphs(stock_data, macd, macdsignal, macdhist, rsi):
    #we can plot some of the data we have made earlier, price and some macd data

    #this will set up the subplot and give it a title
    f, axarr = plt.subplots(3, sharex=True)
    f.suptitle('Stock Price and Technical Indicators')

    #this will configure the first graph - the stock price
    axarr[0].plot(stock_data)
    axarr[0].legend(stock_data)
    axarr[0].set_title('Stock Price')

    #this will plot the MACD, the line is on 0 to reflect convergence/divergence
    axarr[1].plot(macd)
    axarr[1].plot(macdsignal)
    axarr[1].plot(macdhist)
    axarr[1].set_title('MACD')
    axarr[1].axhline(0,color='black',ls='--')

    #this plots RSI, the line on 30 reflects oversold and 70 reflects overbought
    axarr[2].plot(rsi)
    axarr[2].set_title('RSI')
    axarr[2].axhline(30,color='green',ls='--')
    axarr[2].axhline(70,color='red',ls='--')


    plt.show()



def main():
    #this is the main variable where we will run all of the about functions
    ticker = get_ticker()
    start_date = get_start_date(ticker)
    end_date = get_end_date()
    stock_data = get_stock_information(ticker, start_date, end_date)
    macd, macdsignal, macdhist, rsi = tech_indicator_calc(stock_data)
    stock_data = stock_regression(stock_data)
    plot_graphs(stock_data, macd, macdsignal, macdhist, rsi)

    while True:
        replay = str(input('\nDo you want to run this script again? [y/n]:\n'))
        if replay.lower() == 'y':
            ticker = get_ticker()
            start_date = get_start_date(ticker)
            end_date = get_end_date()
            stock_data = get_stock_information(ticker, start_date, end_date)
            macd, macdsignal, macdhist, rsi = tech_indicator_calc(stock_data)
            stock_data = stock_regression(stock_data)
            plot_graphs(stock_data, macd, macdsignal, macdhist, rsi)
            continue
        elif replay.lower() == 'n':
            print('Okay thanks for confirming!')
            raise SystemExit
        else:
            print('That was not a valid input - please try another')
            continue





if __name__ == "__main__":
    main()



#TODO 
#improve regression
#add legend to MACD
#add some fundemental indicators


#TODO v2
#need to add ability to get multiple tickers
#ticker=['AAPL', 'MSFT'], add to quandl call



